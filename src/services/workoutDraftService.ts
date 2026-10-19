import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayOfWeek } from '../types';

const DRAFT_KEY = '@active_workout_draft';

/** Payload shape version, bumped whenever the stored schema changes. */
export const DRAFT_VERSION = 1;

/** Drafts older than this are treated as abandoned and dropped on read. */
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface DraftSetRow {
  setNumber: number;
  weight: string;
  reps: string;
}

export interface DraftExercise {
  exercise: {
    id: string;
    name: string;
    muscleGroup?: string;
  };
  previousSets: { setNumber: number; weight: number; reps: number }[];
  sets: DraftSetRow[];
}

export interface WorkoutDraft {
  /** Schema version of this payload — see `DRAFT_VERSION`. */
  version: number;
  /** Epoch ms of the last successful write, used to expire stale drafts. */
  updatedAt: number;
  /** Session token / primary key allocated upon initiation for idempotent saves. */
  logId?: string;
  /** Generation counter captured when the draft snapshot was created. */
  generation?: number;
  date: string;
  day: DayOfWeek;
  dayName?: string;
  startedAt: number; // epoch ms
  exerciseLogs: DraftExercise[];
  /**
   * Rest-timer duration the user last picked in this session (whole seconds).
   * Optional so drafts written by older builds still hydrate; the screen falls
   * back to the global default when it is absent.
   */
  lastRestDurationSeconds?: number;
}

/**
 * What callers hand to `saveWorkoutDraft`: everything except the two fields the
 * service stamps itself (it owns the version and the write timestamp).
 */
export type WorkoutDraftInput = Omit<WorkoutDraft, 'version' | 'updatedAt'> &
  Partial<Pick<WorkoutDraft, 'version' | 'updatedAt'>>;

/**
 * Bumped by `clearWorkoutDraft`. A queued write captures the generation it was
 * created under and skips itself if the counter has moved on, so a debounced
 * save that fires *after* the draft was discarded can never resurrect it. The
 * abandoned-draft bug this replaces was a verification read plus one retry:
 * correct only while the stray write landed before the retry.
 */
let draftGeneration = 0;

/** Returns the current draft generation counter. */
export function getCurrentDraftGeneration(): number {
  return draftGeneration;
}

/**
 * Serializes every storage operation. Saves and clears are queued behind each
 * other rather than racing, which is what makes the generation check above
 * sufficient: writes reach `AsyncStorage` in the order they were requested, so
 * a discarded draft is never overwritten by an older save.
 *
 * A failed task must not poison the chain, hence the two-argument `then` — the
 * queue continues whether the previous task resolved or rejected.
 */
let writeQueue: Promise<void> = Promise.resolve();

function enqueueTask(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

/**
 * Waits for every storage operation queued so far — writes *and* clears — to
 * settle before reading.
 *
 * A read that jumped the queue would observe a draft that a discard already
 * superseded: `clearWorkoutDraft` bumps the generation and removes the key, but
 * the removal lands a microtask later, so an immediate `getItem` still returns
 * the discarded payload and the screen offers to resume a session the user just
 * threw away. Failed operations are kept out of the rejection path here — a
 * write that failed must not turn a later read into a different failure.
 */
async function awaitPendingWrites(): Promise<void> {
  const pending = writeQueue;
  await pending.then(
    () => {},
    () => {}
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Validates a stored payload field by field.
 *
 * The previous version checked three top-level fields and then asserted the
 * result `as WorkoutDraft`, so a draft stored by an older build — or one whose
 * `sets` entries were the wrong shape — hydrated straight into the screen and
 * crashed on the first `.trim()` of a missing field. Anything that fails here
 * is treated as "no draft" instead of partial input.
 */
function parseDraft(raw: unknown): WorkoutDraft | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.date !== 'string' || raw.date.length === 0) return null;
  if (typeof raw.day !== 'string' || raw.day.length === 0) return null;
  if (typeof raw.startedAt !== 'number' || !Number.isFinite(raw.startedAt)) return null;
  if (!Array.isArray(raw.exerciseLogs)) return null;

  const exerciseLogs: DraftExercise[] = [];
  for (const entry of raw.exerciseLogs) {
    if (!isRecord(entry)) return null;

    const exercise = entry.exercise;
    if (!isRecord(exercise)) return null;
    if (typeof exercise.id !== 'string' || typeof exercise.name !== 'string') return null;

    if (!Array.isArray(entry.previousSets) || !Array.isArray(entry.sets)) return null;

    const previousSets: DraftExercise['previousSets'] = [];
    for (const previous of entry.previousSets) {
      if (!isRecord(previous)) return null;
      if (
        typeof previous.setNumber !== 'number' ||
        typeof previous.weight !== 'number' ||
        typeof previous.reps !== 'number'
      ) {
        return null;
      }
      previousSets.push({
        setNumber: previous.setNumber,
        weight: previous.weight,
        reps: previous.reps,
      });
    }

    const sets: DraftSetRow[] = [];
    for (const set of entry.sets) {
      if (!isRecord(set)) return null;
      if (
        typeof set.setNumber !== 'number' ||
        typeof set.weight !== 'string' ||
        typeof set.reps !== 'string'
      ) {
        return null;
      }
      sets.push({ setNumber: set.setNumber, weight: set.weight, reps: set.reps });
    }

    exerciseLogs.push({
      exercise: {
        id: exercise.id,
        name: exercise.name,
        muscleGroup: typeof exercise.muscleGroup === 'string' ? exercise.muscleGroup : undefined,
      },
      previousSets,
      sets,
    });
  }

  return {
    version: typeof raw.version === 'number' ? raw.version : DRAFT_VERSION,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
    logId: typeof raw.logId === 'string' && raw.logId.length > 0 ? raw.logId : undefined,
    generation: typeof raw.generation === 'number' ? raw.generation : undefined,
    date: raw.date,
    day: raw.day as DayOfWeek,
    dayName: typeof raw.dayName === 'string' ? raw.dayName : undefined,
    startedAt: raw.startedAt,
    exerciseLogs,
    lastRestDurationSeconds:
      typeof raw.lastRestDurationSeconds === 'number' &&
      Number.isFinite(raw.lastRestDurationSeconds) &&
      raw.lastRestDurationSeconds > 0
        ? raw.lastRestDurationSeconds
        : undefined,
  };
}

/**
 * Persists an in-progress logging session so it survives app restarts /
 * crashes. Auto-saved by ActiveWorkoutScreen on every change (debounced).
 *
 * @param draft - Payload to persist.
 * @param snapshotGeneration - Optional generation captured when debounce started.
 * Trailing writes scheduled before clearWorkoutDraft() are discarded.
 */
export function saveWorkoutDraft(
  draft: WorkoutDraftInput,
  snapshotGeneration?: number
): Promise<void> {
  const currentGeneration = draftGeneration;
  const targetGeneration = snapshotGeneration ?? draft.generation ?? currentGeneration;

  // If a clearWorkoutDraft() has occurred since the write/snapshot was scheduled, discard immediately
  if (targetGeneration !== draftGeneration) {
    return Promise.resolve();
  }

  const payload: WorkoutDraft = {
    ...draft,
    version: DRAFT_VERSION,
    updatedAt: Date.now(),
    generation: draftGeneration,
  };

  return enqueueTask(async () => {
    // Discarded if clearWorkoutDraft() ran since this save was requested
    if (targetGeneration !== draftGeneration || currentGeneration !== draftGeneration) {
      return;
    }
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  });
}

/**
 * Reads the stored draft, or `null` when there is none to resume.
 *
 * A draft older than `DRAFT_MAX_AGE_MS` is expired: it is cleared and reported
 * as absent, so the UI opens a fresh session instead of offering to resume
 * yesterday's abandoned one. Unreadable or malformed payloads are cleared too,
 * rather than left to fail the same way on every screen mount.
 */
export async function getWorkoutDraft(): Promise<WorkoutDraft | null> {
  await awaitPendingWrites();

  const raw = await AsyncStorage.getItem(DRAFT_KEY);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await clearWorkoutDraft();
    return null;
  }

  const draft = parseDraft(parsed);
  if (!draft) {
    await clearWorkoutDraft();
    return null;
  }

  if (Date.now() - draft.updatedAt > DRAFT_MAX_AGE_MS) {
    await clearWorkoutDraft();
    return null;
  }

  return draft;
}

/**
 * Discards the draft: bumps the generation so queued saves abort, then deletes
 * the key. The read-back that used to sit here was a weaker version of the
 * same guarantee — it could only catch a write that had already landed.
 */
export function clearWorkoutDraft(): Promise<void> {
  draftGeneration++;
  return enqueueTask(async () => {
    await AsyncStorage.removeItem(DRAFT_KEY);
  });
}
