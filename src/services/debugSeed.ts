/**
 * Development-only workout fixture.
 *
 * Writes roughly a year of plausible training history — sessions, sets, reps and
 * working weights — together with the exercise library, weekly split and day
 * routines that make that history read correctly in Dashboard, Workout and
 * Analytics. It exists so the screens can be exercised against a year of data
 * instead of three hand-typed sets.
 *
 * Why it can never reach a user:
 *
 * - `DEBUG_SEED_MODE` (see `debugSeedModeFor`) resolves to `seed` only in a
 *   development bundle. A release build (`eas build --profile preview` /
 *   `production`, `expo run:android --variant release`) resolves it to `purge`,
 *   which only ever *deletes* fixture rows — and a Jest run resolves it to
 *   `off`, so every other suite keeps asserting against exactly the rows it
 *   inserted itself.
 * - Every row the fixture writes carries the `dbg_` id prefix, and the app's own
 *   writes use `ex_` / `wl_` / `ws_` ids (`addExercise`, `saveWorkoutLog`), so
 *   `purgeDebugFixture` can delete the fixture's rows exactly — without
 *   inspecting values and without a chance of matching user data.
 *
 * The one fixture row type with no id of its own is `weekly_split`: its primary
 * key is the day plus the muscle group, both of which user rows share, so a
 * purge cannot tell a seeded split from a configured one and deliberately
 * leaves it. Deleting split rows by value would eventually delete a split the
 * user configured themselves, and losing real configuration is worse than
 * keeping a debug routine.
 *
 * Generation is deterministic — fixed PRNG seed, and dates derived from `today`
 * with the time of day normalised away — so a bug reproduced against fixture
 * data comes back with the same numbers after a reinstall.
 */
import { format } from 'date-fns';
import type * as SQLite from 'expo-sqlite';
import type { PoolExercise } from '../constants/exercisePool';
import { DayOfWeek } from '../types';
import { formatISODate } from '../utils/dateUtils';

/** Prefix on every id the fixture writes — the handle `purgeDebugFixture` deletes by. */
export const DEBUG_SEED_ID_PREFIX = 'dbg_';

/** How many weeks of history the fixture spans (exactly 52, so the split lines up week to week). */
const FIXTURE_WEEKS = 52;
const FIXTURE_HISTORY_DAYS = FIXTURE_WEEKS * 7;

/** Fixed PRNG seed: the generated year is a stable artifact, not a new draw per install. */
const FIXTURE_SEED = 0x5eed1a7e;

/** Working weight gained across the year (fraction of the starting weight). */
const FIXTURE_PROGRESSION = 0.15;

/** Every eighth week is a deload, and roughly one session in eight is missed. */
const FIXTURE_DELOAD_CYCLE = 8;
const FIXTURE_DELOAD_FACTOR = 0.85;
const FIXTURE_SKIP_RATE = 0.12;

/** Share of sets that come up short of the rep floor — the odd honest grinder. */
const FIXTURE_FAILED_SET_RATE = 0.06;

const FIXTURE_NOTES = [
  'Felt strong today',
  'Slept badly, kept it light',
  'Left shoulder a little tight',
  'Gym was packed, rushed the rest',
];

export type DebugSeedMode = 'seed' | 'purge' | 'off';

/**
 * Decides what the fixture is allowed to do in the running bundle.
 *
 * `dev` is React Native's `__DEV__` and `nodeEnv` is Metro's inlined
 * `process.env.NODE_ENV`. Both are compile-time constants of the bundle, so none
 * of the three outcomes can be reached by a user tapping through the shipped app.
 *
 * Seeding demands a genuine development bundle (`__DEV__` *and* NODE_ENV
 * agreeing, as `expo start` produces). Any other combination — a release build,
 * `expo start --no-dev`, a locally built production bundle — falls through to
 * `purge`, because the safe default for fake history is "do not write it".
 */
export function debugSeedModeFor(dev: boolean, nodeEnv: string | undefined): DebugSeedMode {
  // Jest owns its databases and asserts on exact contents: never seed, never purge.
  if (nodeEnv === 'test') return 'off';
  return dev && nodeEnv === 'development' ? 'seed' : 'purge';
}

/** What this bundle does with the fixture: seed it in development, purge a previous dev install's rows in release, nothing under test. */
export const DEBUG_SEED_MODE: DebugSeedMode = debugSeedModeFor(__DEV__, process.env.NODE_ENV);

interface FixtureExercise {
  name: string;
  muscleGroup: PoolExercise['muscleGroup'];
  /** Working weight at the start of the seeded year, in kilograms — the canonical unit the database stores (`weightUnitPrefs` converts for display). */
  baseWeight: number;
  repRange: [number, number];
  /** Sets logged per session — also the routine's target for that movement. */
  targetSets: number;
}

/**
 * The library the fixture creates. Numbers are chosen to look like a lifter one
 * year into consistent training rather than to be physiologically derived, and
 * `baseWeight: 0` marks a bodyweight movement, which the app stores as a
 * zero-weight set (`getExerciseBestSet` ignores `weight <= 0` for exactly that
 * reason).
 */
const FIXTURE_LIBRARY: FixtureExercise[] = [
  // Monday — push
  { name: 'Barbell Flat Bench Press', muscleGroup: 'Chest', baseWeight: 60, repRange: [6, 8], targetSets: 4 },
  { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', baseWeight: 24, repRange: [8, 10], targetSets: 3 },
  { name: 'Cable Crossover', muscleGroup: 'Chest', baseWeight: 15, repRange: [12, 15], targetSets: 3 },
  { name: 'Tricep Rope Cable Pushdown', muscleGroup: 'Triceps', baseWeight: 30, repRange: [10, 12], targetSets: 3 },
  { name: 'Overhead Cable Tricep Extension', muscleGroup: 'Triceps', baseWeight: 25, repRange: [10, 12], targetSets: 3 },

  // Tuesday — pull
  { name: 'Conventional Deadlift', muscleGroup: 'Back', baseWeight: 110, repRange: [5, 6], targetSets: 3 },
  { name: 'Lat Pulldown (Wide Grip)', muscleGroup: 'Back', baseWeight: 55, repRange: [8, 10], targetSets: 4 },
  { name: 'Seated Cable Row', muscleGroup: 'Back', baseWeight: 50, repRange: [8, 10], targetSets: 3 },
  { name: 'Barbell Standing Bicep Curl', muscleGroup: 'Biceps', baseWeight: 25, repRange: [8, 10], targetSets: 3 },
  { name: 'Dumbbell Hammer Curl', muscleGroup: 'Biceps', baseWeight: 12, repRange: [10, 12], targetSets: 3 },

  // Thursday — shoulders and core
  { name: 'Overhead Barbell Press (OHP)', muscleGroup: 'Shoulders', baseWeight: 40, repRange: [6, 8], targetSets: 4 },
  { name: 'Dumbbell Lateral Raise', muscleGroup: 'Shoulders', baseWeight: 10, repRange: [12, 15], targetSets: 3 },
  { name: 'Face Pulls', muscleGroup: 'Shoulders', baseWeight: 25, repRange: [12, 15], targetSets: 3 },
  { name: 'Cable Rope Kneeling Crunch', muscleGroup: 'Abs & Core', baseWeight: 30, repRange: [12, 15], targetSets: 3 },
  { name: 'Hanging Leg Raise', muscleGroup: 'Abs & Core', baseWeight: 0, repRange: [10, 15], targetSets: 3 },

  // Friday — legs
  { name: 'Barbell Back Squat', muscleGroup: 'Legs', baseWeight: 90, repRange: [6, 8], targetSets: 4 },
  { name: 'Romanian Deadlift (Barbell RDL)', muscleGroup: 'Legs', baseWeight: 70, repRange: [8, 10], targetSets: 3 },
  { name: 'Leg Extension Machine', muscleGroup: 'Legs', baseWeight: 45, repRange: [10, 12], targetSets: 3 },
  { name: 'Standing Barbell Calf Raise', muscleGroup: 'Calves', baseWeight: 60, repRange: [12, 15], targetSets: 4 },

  // Saturday — upper accessories
  { name: 'Incline Barbell Bench Press', muscleGroup: 'Chest', baseWeight: 50, repRange: [8, 10], targetSets: 3 },
  { name: 'Chest-Supported T-Bar Row', muscleGroup: 'Back', baseWeight: 35, repRange: [8, 10], targetSets: 3 },
  { name: 'Machine Chest Press', muscleGroup: 'Chest', baseWeight: 50, repRange: [8, 10], targetSets: 3 },
];

/**
 * Five-day split: which movements each training day logs, in order. The weekly
 * split and the day routines written for the Workout tab are derived from this
 * table, so the seeded plan can never disagree with the seeded history.
 */
const FIXTURE_ROUTINE: { day: DayOfWeek; exercises: string[] }[] = [
  {
    day: 'Monday',
    exercises: [
      'Barbell Flat Bench Press',
      'Incline Dumbbell Press',
      'Cable Crossover',
      'Tricep Rope Cable Pushdown',
      'Overhead Cable Tricep Extension',
    ],
  },
  {
    day: 'Tuesday',
    exercises: [
      'Conventional Deadlift',
      'Lat Pulldown (Wide Grip)',
      'Seated Cable Row',
      'Barbell Standing Bicep Curl',
      'Dumbbell Hammer Curl',
    ],
  },
  {
    day: 'Thursday',
    exercises: [
      'Overhead Barbell Press (OHP)',
      'Dumbbell Lateral Raise',
      'Face Pulls',
      'Cable Rope Kneeling Crunch',
      'Hanging Leg Raise',
    ],
  },
  {
    day: 'Friday',
    exercises: [
      'Barbell Back Squat',
      'Romanian Deadlift (Barbell RDL)',
      'Leg Extension Machine',
      'Standing Barbell Calf Raise',
    ],
  },
  {
    day: 'Saturday',
    exercises: [
      'Incline Barbell Bench Press',
      'Chest-Supported T-Bar Row',
      'Machine Chest Press',
      'Dumbbell Lateral Raise',
    ],
  },
];

export interface DebugSeedResult {
  sessions: number;
  sets: number;
  exercises: number;
}

/**
 * Writes the fixture into a database that still looks brand new, and does
 * nothing anywhere else.
 *
 * "Brand new" means no session, library entry, routine or split — the state of a
 * fresh install. A developer who uses a debug build as their daily driver
 * therefore never has fixture rows injected into real training data, and a
 * database that already carries history keeps it on every later launch.
 *
 * @param options.today - Reference day for the generated year: the 52
 *   Monday-aligned weeks ending with the week that contains it, written up to
 *   the day before it. Defaults to now.
 */
export async function seedDebugFixture(
  db: SQLite.SQLiteDatabase,
  options: { today?: Date } = {}
): Promise<DebugSeedResult | null> {
  if (!(await isPristine(db))) return null;

  const today = options.today ?? new Date();
  const rng = createRng(FIXTURE_SEED);
  const library = new Map(FIXTURE_LIBRARY.map((exercise) => [exercise.name, exercise]));

  // The split references the seeded muscle groups by their real ids, so a
  // renamed group surfaces here as a clear error instead of a silently missing
  // tile (the failure is caught by the caller and never breaks the app).
  const groups = await db.getAllAsync<{ id: string; name: string }>(
    'SELECT id, name FROM muscle_groups;'
  );
  const groupIdByName = new Map(groups.map((group) => [group.name, group.id]));

  const history = historyDates(today, FIXTURE_HISTORY_DAYS);
  const todayStr = formatISODate(today);
  const createdAt = history[0].toISOString();

  const exerciseRows: (string | number)[][] = FIXTURE_LIBRARY.map((exercise) => [
    exerciseId(exercise.name),
    exercise.name,
    exercise.muscleGroup,
    createdAt,
  ]);

  const splitRows: (string | number)[][] = [];
  const templateRows: (string | number)[][] = [];
  for (const { day, exercises } of FIXTURE_ROUTINE) {
    for (const groupName of distinctGroups(exercises, library)) {
      const groupId = groupIdByName.get(groupName);
      if (!groupId) throw new Error(`[debugSeed] unknown muscle group "${groupName}"`);
      splitRows.push([day, groupId]);
    }
    exercises.forEach((name, order) => {
      templateRows.push([day, exerciseId(name), library.get(name)!.targetSets, order]);
    });
  }

  const logRows: (string | number)[][] = [];
  const setRows: (string | number)[][] = [];

  // Oldest day first: the week index drives the (deterministic) progression, so
  // the order of the draws below is part of the fixture's contract.
  history.forEach((date, index) => {
    const dateStr = formatISODate(date);
    if (dateStr >= todayStr) return; // Today and the rest of this week stay free

    const dayOfWeek = format(date, 'EEEE') as DayOfWeek;
    const routine = FIXTURE_ROUTINE.find((plan) => plan.day === dayOfWeek);
    if (!routine) return; // Rest day
    if (rng() < FIXTURE_SKIP_RATE) return; // Missed session

    const week = Math.floor(index / 7);
    const isDeload = week % FIXTURE_DELOAD_CYCLE === FIXTURE_DELOAD_CYCLE - 1;
    const logId = `${DEBUG_SEED_ID_PREFIX}wl_${dateStr}`;

    logRows.push([logId, dateStr, dayOfWeek, pickNote(rng, isDeload), 1]);

    for (const name of routine.exercises) {
      const exercise = library.get(name)!;
      const weight = workingWeight(exercise.baseWeight, week, isDeload, rng);
      const setCount = Math.max(2, exercise.targetSets - (isDeload ? 1 : 0));
      for (let setNumber = 1; setNumber <= setCount; setNumber++) {
        setRows.push([
          `${DEBUG_SEED_ID_PREFIX}ws_${dateStr}_${slug(name)}_${setNumber}`,
          logId,
          exerciseId(name),
          setNumber,
          weight,
          workingReps(exercise.repRange, setNumber, setCount, rng),
        ]);
      }
    }
  });

  await db.withTransactionAsync(async () => {
    await insertRows(db, 'exercises', ['id', 'name', 'muscleGroup', 'createdAt'], exerciseRows);
    await insertRows(db, 'weekly_split', ['day_of_week', 'muscle_group_id'], splitRows);
    await insertRows(db, 'day_templates', ['day_of_week', 'exercise_id', 'target_sets', 'sort_order'], templateRows);
    await insertRows(db, 'workout_logs', ['id', 'date', 'day_of_week', 'notes', 'completed'], logRows);
    await insertRows(db, 'workout_sets', ['id', 'workout_log_id', 'exercise_id', 'set_number', 'weight', 'reps'], setRows);
  });

  return { sessions: logRows.length, sets: setRows.length, exercises: exerciseRows.length };
}

/**
 * Deletes every row the fixture wrote, and only those rows.
 *
 * Safe on a database that never saw the fixture (the DELETEs match nothing) and
 * safe next to real data, because the app's own ids never start with `dbg_`.
 *
 * `workout_sets` and `day_templates` are not deleted directly: both cascade from
 * the parent rows removed here, and `foreign_keys = ON` is re-asserted on every
 * connection (see `configureConnection`), so the cascades really fire.
 *
 * @returns How many parent rows were removed — nonzero only on a release build
 *   installed over a development install's database.
 */
export async function purgeDebugFixture(db: SQLite.SQLiteDatabase): Promise<number> {
  // GLOB, not LIKE: `_` is a single-character wildcard in LIKE (`dbgX...` would
  // match) and a literal in GLOB, and the pattern is built from our own constant.
  const pattern = `${DEBUG_SEED_ID_PREFIX}*`;
  const logs = await db.runAsync('DELETE FROM workout_logs WHERE id GLOB ?;', [pattern]);
  const exercises = await db.runAsync('DELETE FROM exercises WHERE id GLOB ?;', [pattern]);
  return logs.changes + exercises.changes;
}

/**
 * True when the install still looks brand new: no session, library entry,
 * routine or split. One round trip, counts only — the values never matter.
 */
async function isPristine(db: SQLite.SQLiteDatabase): Promise<boolean> {
  const counts = await db.getFirstAsync<Record<string, number>>(
    `SELECT
       (SELECT COUNT(*) FROM workout_logs) AS logs,
       (SELECT COUNT(*) FROM exercises) AS exercises,
       (SELECT COUNT(*) FROM day_templates) AS templates,
       (SELECT COUNT(*) FROM weekly_split) AS split;`
  );
  if (!counts) return true;
  return Object.values(counts).every((count) => count === 0);
}

/**
 * The `days` days of the 52 calendar weeks ending with the one that contains
 * `today`, oldest first — Monday through Sunday, so the week index behind the
 * progression and the deloads always lines up with a real training week.
 *
 * Days from `today` onward are returned too and skipped by the caller, which is
 * what keeps the history ending at *yesterday* (today stays free so the logging
 * flow can be walked against a seeded past without a log already sitting on the
 * date `saveWorkoutLog` would write).
 *
 * Each day is built at noon from explicit year/month/day offsets: constructing
 * the local date that way keeps month/year rollover and daylight-saving shifts
 * from ever producing an off-by-one day.
 */
function historyDates(today: Date, days: number): Date[] {
  // Monday of the week containing `today`, then back to the first Monday of the span.
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - ((today.getDay() + 6) % 7),
    12
  );
  const first = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - (days - 7), 12);
  return Array.from(
    { length: days },
    (_, offset) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + offset, 12)
  );
}

/** Distinct muscle groups of a day's routine, in routine order. */
function distinctGroups(exercises: string[], library: Map<string, FixtureExercise>): string[] {
  return Array.from(new Set(exercises.map((name) => library.get(name)!.muscleGroup)));
}

/** `Barbell Flat Bench Press` -> `barbell_flat_bench_press`. */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function exerciseId(name: string): string {
  return `${DEBUG_SEED_ID_PREFIX}ex_${slug(name)}`;
}

/**
 * Working weight for one session: a linear year of progress, ±2% day-to-day
 * noise, and the deload dip. Bodyweight movements stay at zero.
 */
function workingWeight(
  baseWeight: number,
  week: number,
  isDeload: boolean,
  rng: () => number
): number {
  if (baseWeight <= 0) return 0;
  const progress = 1 + FIXTURE_PROGRESSION * (week / (FIXTURE_WEEKS - 1));
  const noise = 1 + (rng() - 0.5) * 0.04;
  return roundToPlate(baseWeight * progress * noise * (isDeload ? FIXTURE_DELOAD_FACTOR : 1));
}

/**
 * Reps for one set: somewhere in the movement's range, one fewer on the last
 * (grinding) set, and occasionally a set that falls short of the floor.
 */
function workingReps(
  [min, max]: [number, number],
  setNumber: number,
  setCount: number,
  rng: () => number
): number {
  const reps = min + Math.floor(rng() * (max - min + 1));
  if (setNumber === setCount) return Math.max(1, reps - 1);
  if (rng() < FIXTURE_FAILED_SET_RATE) return Math.max(1, min - 2);
  return reps;
}

/**
 * Session note. A deload always says so — it explains the dip in the charts —
 * and the rest of the year gets the occasional one-liner so the notes UI has
 * something to render.
 */
function pickNote(rng: () => number, isDeload: boolean): string {
  if (isDeload) return 'Deload week — kept it light';
  if (rng() > 0.06) return '';
  return FIXTURE_NOTES[Math.floor(rng() * FIXTURE_NOTES.length)];
}

/** Nearest weight a gym actually loads: 2.5 steps on barbell work, 1 on the light accessories. */
function roundToPlate(weight: number): number {
  const step = weight >= 20 ? 2.5 : 1;
  return Math.round(weight / step) * step;
}

/** mulberry32 — 32-bit PRNG, a handful of lines and stable across engines. */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rows per multi-row INSERT. SQLite builds older than 3.32 cap a statement at
 * 999 bound parameters; 100 rows of the widest table here (6 columns) stays
 * clear of that, while keeping a year of history to a few dozen statements
 * instead of a few thousand individual inserts.
 */
const ROWS_PER_INSERT = 100;

/** Inserts rows in chunks (table and columns are code constants, never user input). */
async function insertRows(
  db: SQLite.SQLiteDatabase,
  table: string,
  columns: string[],
  rows: (string | number)[][]
): Promise<void> {
  for (let start = 0; start < rows.length; start += ROWS_PER_INSERT) {
    const chunk = rows.slice(start, start + ROWS_PER_INSERT);
    const values = chunk.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    await db.runAsync(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values};`,
      chunk.flat()
    );
  }
}
