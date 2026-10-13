import * as SQLite from 'expo-sqlite';
import { DayOfWeek, Exercise, MuscleGroup, WorkoutLog } from '../types';
import { DAYS_OF_WEEK, calculateWorkoutStreak, formatISODate } from '../utils/dateUtils';
import { EPLEY_ONE_REP_MAX_SQL } from '../utils/calculations';
import { DEBUG_SEED_MODE, purgeDebugFixture, seedDebugFixture } from './debugSeed';

/** Physical database file name (also used by tests to open the same store). */
export const DB_NAME = 'gym_tracker.db';

/**
 * Creates a primary key for a row written by this module.
 *
 * The trailing counter is what makes the ids *monotonic*: two rows written in
 * the same millisecond (a multi-set save, or two sessions logged back to back)
 * would otherwise be ordered by their random suffix, so "the newest log for a
 * date" — which orders by `id DESC` as the tie-breaker for a shared date —
 * could just as easily return the older one. The random suffix stays to keep
 * ids from colliding with whatever a previous install wrote for the same
 * millisecond.
 */
let idSequence = 0;
const createId = (prefix: string): string =>
  `${prefix}${Date.now()}_${idSequence++}_${Math.random().toString(36).substring(2, 7)}`;

/** Pre-allocates a unique session logId for idempotent workout logging. */
export function createWorkoutLogId(): string {
  return createId('wl_');
}

/**
 * Thrown when an exercise name is already taken. Callers detect the collision
 * with `instanceof` instead of matching a magic error message, so a future
 * rename of the message cannot silently turn a handled duplicate into an
 * unhandled failure.
 */
export class ExerciseAlreadyExistsError extends Error {
  /** True when the name is held by an archived exercise rather than a live one. */
  readonly archived: boolean;

  constructor(name: string, options: { archived?: boolean } = {}) {
    super(
      options.archived
        ? `An archived exercise is already named "${name}". Rename it to reuse the name.`
        : `An exercise named "${name}" already exists in the library.`
    );
    this.name = 'ExerciseAlreadyExistsError';
    this.archived = options.archived ?? false;
  }
}

/**
 * Thrown when a set cannot be stored as given — a missing exercise id, a
 * non-finite or negative weight, or a rep count that is not a positive integer.
 *
 * Raising this *before* the write transaction is what keeps the caller honest:
 * the previous behaviour dropped such rows silently and still returned a log
 * id, so a caller could believe a session was saved in full when the database
 * held no sets at all.
 */
export class InvalidSetError extends Error {
  readonly index: number;

  constructor(index: number, reason: string) {
    super(`Set at index ${index} is invalid: ${reason}`);
    this.name = 'InvalidSetError';
    this.index = index;
  }
}

/**
 * Thrown when a set references an exercise that is not in the library at all.
 * A soft-archived exercise is *not* rejected — history has to keep accepting
 * the movements it was recorded with.
 */
export class UnknownExerciseError extends Error {
  readonly exerciseId: string;

  constructor(exerciseId: string) {
    super(`Cannot log sets for unknown exercise "${exerciseId}".`);
    this.name = 'UnknownExerciseError';
    this.exerciseId = exerciseId;
  }
}

// Pre-populated default muscle groups (exercises are user-created only — empty by default)
const DEFAULT_MUSCLE_GROUPS: { id: string; name: string }[] = [
  { id: 'mg_chest', name: 'Chest' },
  { id: 'mg_back', name: 'Back' },
  { id: 'mg_legs', name: 'Legs' },
  { id: 'mg_shoulders', name: 'Shoulders' },
  { id: 'mg_biceps', name: 'Biceps' },
  { id: 'mg_triceps', name: 'Triceps' },
  { id: 'mg_forearms', name: 'Forearms' },
  { id: 'mg_abs', name: 'Abs & Core' },
  { id: 'mg_calves', name: 'Calves' },
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Opens the one connection the whole app shares.
 *
 * The *promise* is what gets cached, not the connection: it is assigned before
 * the first `await`, so every caller that arrives while the connection is still
 * initializing — Dashboard, Analytics, and Store all fire on mount — awaits the
 * exact same init instead of racing `openDatabaseAsync` for a second native
 * handle on the same file. `openDatabaseAsync` builds a fresh `NativeDatabase`
 * on each call, so parallel opens would contend for the file lock and surface
 * as `database is locked` (SQLITE_BUSY).
 *
 * A failed init clears the cache. Without that, the rejected promise would be
 * handed to every future caller forever: a single transient open/schema failure
 * at startup would brick the data layer for the rest of the process lifetime,
 * with no path back to a working connection.
 */
export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await configureConnection(db);
      await initSchema(db);
      await applyDebugFixture(db);
      return db;
    })().catch((err) => {
      // Only clear our own attempt: a later caller may already have installed a
      // fresh promise while this one was settling.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/**
 * Drops a handle whose initialization or migration failed.
 * Explicitly executes await db.closeAsync() on the native handle BEFORE
 * nulling or resetting the cached DB connection promise to avoid native handle
 * and write-lock leaks.
 */
async function closeAndInvalidateConnection(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.closeAsync();
  } catch {
    // Best-effort handle close
  }
  dbPromise = null;
}

/**
 * Applies the connection-scoped pragmas to a freshly opened connection.
 *
 * All three are connection settings rather than properties of the database
 * file (only the WAL journal mode is remembered in the file itself), so a fresh
 * launch would otherwise hand every query SQLite's defaults — and those lose a
 * race between a read and a write with `database is locked` (SQLITE_BUSY):
 *
 * - `busy_timeout = 5000` gives SQLite up to 5s to wait for a lock it cannot
 *   take immediately, instead of rejecting it. Set first so the statements
 *   below already benefit from it.
 * - `journal_mode = WAL` lets readers run while a write transaction is open.
 *   The default rollback journal locks the whole file for the duration of a
 *   write, so any query in flight at that moment fails instead of waiting.
 * - `foreign_keys = ON` keeps `ON DELETE CASCADE` working; SQLite defaults it
 *   to OFF on every new connection, so it has to be re-asserted here or
 *   cascades silently stop working from the second launch onward.
 *
 * Must stay outside any transaction (`journal_mode`/`foreign_keys` are no-ops
 * inside one) and outside the version guard in `initSchema`, which is skipped
 * on every launch after the first.
 */
async function configureConnection(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
}

/**
 * Schema version stamped into `PRAGMA user_version` once the base schema has
 * been created. Bump this and add a matching migration branch inside
 * `initSchema` whenever the base schema changes.
 *
 * 2 — `exercises.is_archived` (soft deletion) plus the relational indexes.
 */
export const SCHEMA_VERSION = 2;

async function initSchema(db: SQLite.SQLiteDatabase) {
  // Connection pragmas (foreign keys, WAL, busy timeout) are applied by
  // `configureConnection` on every open — do not re-issue them here.
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const schemaVersion = versionRow?.user_version ?? 0;

  // Each step repairs the state its predecessor left behind, so an interrupted
  // upgrade resumes instead of stopping half-written. Every failure unwinds its
  // own transaction and re-asserts the connection pragmas before the handle is
  // thrown away (see `invalidateConnection`).
  if (schemaVersion < SCHEMA_VERSION) {
    if (schemaVersion === 0) {
      await createBaseSchema(db);
      await repairLegacySchema(db);
    }
    if (schemaVersion < 2) {
      await migrateToSoftDelete(db);
    }
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }

  await createIndexes(db);

  // Seed default muscle groups if empty (exercises stay empty — user-created only)
  const countRes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM muscle_groups;');
  if (countRes && countRes.count === 0) {
    await seedDefaultMuscleGroups(db);

    // No pre-populated routine split — all days start completely empty/unassigned.
    // The user must explicitly configure their weekly split via Settings > Routine Split.
  }
}

/**
 * Adds the exercise soft-delete flag to a database created before it existed.
 *
 * `ALTER TABLE ... ADD COLUMN` cannot run inside a transaction in SQLite, so
 * the statement is guarded by a column probe instead; the failure path still
 * re-asserts the connection pragma before the handle is retired, because the
 * schema probe leaves the connection in whatever state it failed in.
 */
async function migrateToSoftDelete(db: SQLite.SQLiteDatabase) {
  try {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(exercises);');
    if (!columns.some((column) => column.name === 'is_archived')) {
      await db.execAsync(
        'ALTER TABLE exercises ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;'
      );
    }
  } catch (err) {
    await rollbackQuietly(db);
    await reassertForeignKeys(db);
    console.error('Migration failed (soft delete column):', err);
    await closeAndInvalidateConnection(db);
    throw err;
  } finally {
    await reassertForeignKeys(db);
  }
}

/**
 * Creates the relational indexes backing the foreign-key cascades and the
 * analytics joins (`workout_sets.exercise_id`, `workout_sets.workout_log_id`,
 * `workout_sets(exercise_id, workout_log_id)`, `workout_logs.date`,
 * `exercises.name WHERE is_archived = 0`).
 *
 * Runs on every launch: `IF NOT EXISTS` is free when they are already there,
 * and this is what lets a launch that crashed after the version stamp — but
 * before the indexes — finish the job on the next start.
 */
async function createIndexes(db: SQLite.SQLiteDatabase) {
  try {
    await db.execAsync(`
      DROP INDEX IF EXISTS idx_exercises_archived;
      CREATE INDEX IF NOT EXISTS idx_workout_sets_log_id ON workout_sets(workout_log_id);
      CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(exercise_id);
      CREATE INDEX IF NOT EXISTS idx_workout_sets_composite ON workout_sets(exercise_id, workout_log_id);
      CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(date);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_active_name ON exercises(name COLLATE NOCASE) WHERE is_archived = 0;
    `);
  } catch (err) {
    await rollbackQuietly(db);
    await reassertForeignKeys(db);
    console.error('Failed to create schema indexes:', err);
    await closeAndInvalidateConnection(db);
    throw err;
  }
}

/** Rolls back an open transaction, ignoring "no transaction is active". */
async function rollbackQuietly(db: SQLite.SQLiteDatabase) {
  try {
    await db.execAsync('ROLLBACK;');
  } catch {
    // No transaction was open — nothing to unwind.
  }
}

/** Re-asserts the connection pragma that migrations turn off. */
async function reassertForeignKeys(db: SQLite.SQLiteDatabase) {
  try {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  } catch {
    // The handle is already broken; `closeAndInvalidateConnection` retires it.
  }
}

/**
 * Writes the default muscle groups as one transaction, so an interruption
 * cannot leave the library seeded with a subset — a half-seeded state would
 * never be repaired, because the count guard only fires on an empty table.
 */
async function seedDefaultMuscleGroups(db: SQLite.SQLiteDatabase) {
  try {
    await db.withTransactionAsync(async () => {
      for (const mg of DEFAULT_MUSCLE_GROUPS) {
        await db.runAsync('INSERT INTO muscle_groups (id, name) VALUES (?, ?);', [mg.id, mg.name]);
      }
    });
  } catch (err) {
    await rollbackQuietly(db);
    await reassertForeignKeys(db);
    console.error('Failed to seed default muscle groups:', err);
    await closeAndInvalidateConnection(db);
    throw err;
  }
}

/**
 * Runs the development fixture once per connection: `seed` on a development
 * bundle, `purge` on a release bundle, nothing under test (see `debugSeed.ts`
 * for why those three are compile-time outcomes).
 *
 * A release build therefore deletes a development install's fixture rows even
 * when the database file survived an in-place upgrade — the one path where
 * seeded data could otherwise outlive the build that created it.
 *
 * Failures are swallowed on purpose: the fixture is a debugging aid, and a
 * fixture problem must never take the data layer down with it.
 */
async function applyDebugFixture(db: SQLite.SQLiteDatabase) {
  if (DEBUG_SEED_MODE === 'off') return;

  try {
    if (DEBUG_SEED_MODE === 'seed') {
      const seeded = await seedDebugFixture(db);
      if (seeded) {
        console.log(
          `[debugSeed] seeded ${seeded.sessions} sessions / ${seeded.sets} sets across ${seeded.exercises} exercises`
        );
      }
    } else {
      const removed = await purgeDebugFixture(db);
      if (removed > 0) {
        console.warn(`[debugSeed] removed ${removed} rows left behind by a development fixture`);
      }
    }
  } catch (err) {
    console.warn('[debugSeed] fixture skipped:', err);
  }
}

/** Creates every base table (idempotent). */
async function createBaseSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS muscle_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      muscleGroup TEXT,
      createdAt TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS weekly_split (
      day_of_week TEXT NOT NULL,
      muscle_group_id TEXT NOT NULL,
      PRIMARY KEY (day_of_week, muscle_group_id),
      FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      day_of_week TEXT NOT NULL,
      notes TEXT,
      completed INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY,
      workout_log_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      FOREIGN KEY (workout_log_id) REFERENCES workout_logs (id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS day_templates (
      day_of_week TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      target_sets INTEGER NOT NULL DEFAULT 3,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day_of_week, exercise_id),
      FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
    );
  `);
}

/**
 * Repairs databases created before the unified exercise-library schema landed.
 * Every step is idempotent and safe to run on an already-correct schema.
 */
async function repairLegacySchema(db: SQLite.SQLiteDatabase) {
  // ------------------------------------------------------------------
  // Legacy exercises table (muscle_group_id FK) -> unified global library
  // model. The library starts empty by design (user-created only), so the
  // legacy rows are dropped along with the table they came from.
  // ------------------------------------------------------------------
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(exercises);');
  const hasLegacyColumn = columns.some((column) => column.name === 'muscle_group_id');
  const hasUnifiedColumns =
    columns.some((column) => column.name === 'muscleGroup') &&
    columns.some((column) => column.name === 'createdAt');

  if (hasLegacyColumn && !hasUnifiedColumns) {
    await runSchemaRepair(db, 'rename legacy exercises table', async () => {
      // `ALTER TABLE ... RENAME` rewrites the FK clauses inside the child
      // tables to follow the rename, so `workout_sets` and `day_templates` end
      // up pointing at `exercises_legacy`. The rebuild below — and the repair
      // pass in `rebuildChildForeignKeys` — is what moves them back.
      await db.execAsync(`
        ALTER TABLE exercises RENAME TO exercises_legacy;
        CREATE TABLE exercises (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          muscleGroup TEXT,
          createdAt TEXT
        );
        DROP TABLE exercises_legacy;
      `);
    });
  }

  await rebuildChildForeignKeys(db);
}

/**
 * Points the child tables back at the live `exercises` table whenever their
 * foreign keys reference something else (typically `exercises_legacy`, left
 * behind by the rename above). Every INSERT into such a table fails with a
 * foreign key error until this runs, so it is skipped only when both child
 * tables are already correct — which keeps a relaunch cheap.
 *
 * Also drops set and template rows whose exercise no longer exists: they are
 * unreachable (every read joins through `exercises`) and would otherwise
 * survive as orphans that no later code path can explain.
 */
async function rebuildChildForeignKeys(db: SQLite.SQLiteDatabase) {
  const setsFk = await db.getAllAsync<{ table: string }>('PRAGMA foreign_key_list(workout_sets);');
  const templateFk = await db.getAllAsync<{ table: string }>(
    'PRAGMA foreign_key_list(day_templates);'
  );
  const childrenNeedRebuild =
    !setsFk.some((fk) => fk.table === 'exercises') ||
    !templateFk.some((fk) => fk.table === 'exercises');

  if (!childrenNeedRebuild) return;

  await runSchemaRepair(db, 'rebuild child foreign keys', async () => {
    await db.execAsync(`
      DROP TABLE IF EXISTS exercises_legacy;

      -- Rebuild workout_sets with its FK pointing at the live exercises table
      DROP TABLE IF EXISTS workout_sets_new;
      CREATE TABLE workout_sets_new (
        id TEXT PRIMARY KEY,
        workout_log_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        set_number INTEGER NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        FOREIGN KEY (workout_log_id) REFERENCES workout_logs (id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
      );
      INSERT INTO workout_sets_new (id, workout_log_id, exercise_id, set_number, weight, reps)
        SELECT id, workout_log_id, exercise_id, set_number, weight, reps FROM workout_sets;
      DROP TABLE workout_sets;
      ALTER TABLE workout_sets_new RENAME TO workout_sets;

      -- Rebuild day_templates with its FK pointing at the live exercises table
      DROP TABLE IF EXISTS day_templates_new;
      CREATE TABLE day_templates_new (
        day_of_week TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        target_sets INTEGER NOT NULL DEFAULT 3,
        sort_order INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day_of_week, exercise_id),
        FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
      );
      INSERT INTO day_templates_new (day_of_week, exercise_id, target_sets, sort_order)
        SELECT day_of_week, exercise_id, target_sets, sort_order FROM day_templates;
      DROP TABLE day_templates;
      ALTER TABLE day_templates_new RENAME TO day_templates;

      -- Drop rows referencing exercises that no longer exist (old seeds)
      DELETE FROM workout_sets WHERE exercise_id NOT IN (SELECT id FROM exercises);
      DELETE FROM day_templates WHERE exercise_id NOT IN (SELECT id FROM exercises);
    `);
  });
}

/**
 * Runs one migration block inside a transaction that cannot leak.
 *
 * The failures this guards against are the ones a plain `execAsync` hides: a
 * statement that throws leaves the transaction open and `foreign_keys` OFF
 * (the pragma is ignored inside a transaction, so `PRAGMA foreign_keys = OFF`
 * only takes effect once the block ends). A leaked transaction then makes
 * every later write fail with `SQLITE_BUSY`, which looks like an unrelated
 * bug. So: rollback on failure, pragma re-asserted either way, and the
 * connection retired so the next call starts from a working handle.
 *
 * Must not be called while another transaction is open — SQLite has no nested
 * transactions, and a `BEGIN` inside one is an error.
 */
async function runSchemaRepair(
  db: SQLite.SQLiteDatabase,
  label: string,
  repair: () => Promise<void>
) {
  try {
    await db.execAsync('BEGIN;');
    // Child rows are re-inserted verbatim below; enforcing the FKs mid-rename
    // would reject them while their parent table is still named differently.
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    await repair();
    await db.execAsync('PRAGMA foreign_key_check;');
    await db.execAsync('COMMIT;');
  } catch (err) {
    await rollbackQuietly(db);
    await reassertForeignKeys(db);
    console.error(`Schema repair failed (${label}):`, err);
    await closeAndInvalidateConnection(db);
    throw err;
  } finally {
    await reassertForeignKeys(db);
  }
}

// Muscle Groups API
export async function getMuscleGroups(): Promise<MuscleGroup[]> {
  const db = await getDB();
  return await db.getAllAsync<MuscleGroup>('SELECT id, name FROM muscle_groups ORDER BY name ASC;');
}

// Exercises API (Global Exercise Library)

export async function getExercisesByMuscleGroup(muscleGroupName: string): Promise<Exercise[]> {
  const db = await getDB();
  return await db.getAllAsync<Exercise>(
    `SELECT id, name, muscleGroup, createdAt FROM exercises
     WHERE muscleGroup = ? AND is_archived = 0 ORDER BY name ASC;`,
    [muscleGroupName]
  );
}

export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDB();
  return await db.getAllAsync<Exercise>(
    'SELECT id, name, muscleGroup, createdAt FROM exercises WHERE is_archived = 0 ORDER BY name ASC;'
  );
}

// Adds a user-created exercise to the global library.
// If an archived exercise with matching name already exists, re-activates it and updates muscleGroup.
// Throws ExerciseAlreadyExistsError only if an active exercise already exists with this name.
export async function addExercise(name: string, muscleGroupName: string): Promise<Exercise> {
  const db = await getDB();
  const trimmed = name.trim();

  const existing = await db.getFirstAsync<{ id: string; is_archived: number; muscleGroup: string | null; createdAt: string | null }>(
    'SELECT id, is_archived, muscleGroup, createdAt FROM exercises WHERE name = ? COLLATE NOCASE;',
    [trimmed]
  );
  if (existing) {
    if (existing.is_archived === 1) {
      // Re-activate the archived exercise cleanly
      await db.runAsync(
        'UPDATE exercises SET is_archived = 0, muscleGroup = ? WHERE id = ?;',
        [muscleGroupName || null, existing.id]
      );
      return {
        id: existing.id,
        name: trimmed,
        muscleGroup: muscleGroupName || undefined,
        createdAt: existing.createdAt ?? undefined,
      };
    }
    throw new ExerciseAlreadyExistsError(trimmed, { archived: false });
  }

  const id = createId('ex_');
  const createdAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO exercises (id, name, muscleGroup, createdAt, is_archived) VALUES (?, ?, ?, ?, 0);',
    [id, trimmed, muscleGroupName || null, createdAt]
  );
  return { id, name: trimmed, muscleGroup: muscleGroupName || undefined, createdAt };
}

export async function updateExercise(
  id: string,
  name: string,
  muscleGroupName: string
): Promise<void> {
  const db = await getDB();
  const trimmed = name.trim();

  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM exercises WHERE name = ? COLLATE NOCASE AND id != ?;',
    [trimmed, id]
  );
  if (existing) {
    throw new ExerciseAlreadyExistsError(trimmed);
  }

  await db.runAsync('UPDATE exercises SET name = ?, muscleGroup = ? WHERE id = ?;', [
    trimmed,
    muscleGroupName || null,
    id,
  ]);
}

/**
 * Archives an exercise instead of deleting it.
 *
 * A hard `DELETE` used to cascade into `workout_sets` and `day_templates`,
 * which silently erased the training history of every session that used the
 * movement: the parent `workout_logs` row survived (it still carries the
 * streak and compliance counts) while its sets vanished from volume graphs and
 * 1RM charts. Archiving hides the exercise from the catalog and the routine
 * builder and leaves every logged set readable.
 */
export async function deleteExercise(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('UPDATE exercises SET is_archived = 1 WHERE id = ?;', [id]);
}

// Distinct exercises that have at least one logged session or appear in a configured routine.
// An archived exercise stays listed only while it carries logged history — the
// analytics picker has to be able to chart the movements that were actually
// trained, and dropping them here would silently thin out those charts.
export async function getTrackedExercises(): Promise<Exercise[]> {
  const db = await getDB();
  const [logged, templated] = await Promise.all([
    db.getAllAsync<Exercise>(
      `SELECT DISTINCT e.id, e.name, e.muscleGroup, e.createdAt
       FROM workout_sets ws
       JOIN workout_logs wl ON ws.workout_log_id = wl.id
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE wl.completed = 1;`
    ),
    db.getAllAsync<Exercise>(
      `SELECT DISTINCT e.id, e.name, e.muscleGroup, e.createdAt
       FROM day_templates dt
       JOIN exercises e ON dt.exercise_id = e.id
       WHERE e.is_archived = 0;`
    ),
  ]);

  const byId = new Map<string, Exercise>();
  for (const ex of [...logged, ...templated]) {
    if (!byId.has(ex.id)) byId.set(ex.id, ex);
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Weekly Split API
export async function getWeeklySplit(): Promise<Record<DayOfWeek, string[]>> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ day_of_week: DayOfWeek; muscle_group_id: string }>(
    'SELECT day_of_week, muscle_group_id FROM weekly_split;'
  );

  const split: Record<DayOfWeek, string[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };

  for (const row of rows) {
    if (split[row.day_of_week]) {
      split[row.day_of_week].push(row.muscle_group_id);
    }
  }

  return split;
}

export async function saveWeeklySplit(split: Record<DayOfWeek, string[]>): Promise<void> {
  const db = await getDB();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM weekly_split;');
    for (const [day, mgIds] of Object.entries(split)) {
      for (const mgId of mgIds) {
        await db.runAsync('INSERT INTO weekly_split (day_of_week, muscle_group_id) VALUES (?, ?);', [
          day,
          mgId,
        ]);
      }
    }
  });
}

// Day Routine Template API (Workout tab: exercises + target set counts per day)

/**
 * The day's routine, joined with its exercises in one query.
 *
 * Archived exercises drop out of the routine view: the row and the logged
 * history it explains stay in the database, but a movement the user removed
 * from the catalog should not keep appearing as something to train today.
 */
export async function getDayTemplate(
  day: DayOfWeek
): Promise<{ exercise: Exercise; targetSets: number }[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    muscleGroup: string | null;
    createdAt: string | null;
    target_sets: number;
  }>(
    `SELECT e.id, e.name, e.muscleGroup, e.createdAt, dt.target_sets
     FROM day_templates dt
     JOIN exercises e ON dt.exercise_id = e.id
     WHERE dt.day_of_week = ? AND e.is_archived = 0
     ORDER BY dt.sort_order ASC;`,
    [day]
  );

  return rows.map((row) => ({
    exercise: {
      id: row.id,
      name: row.name,
      muscleGroup: row.muscleGroup ?? undefined,
      createdAt: row.createdAt ?? undefined,
    },
    targetSets: row.target_sets,
  }));
}

export async function saveDayTemplate(
  day: DayOfWeek,
  items: { exerciseId: string; targetSets: number }[]
): Promise<void> {
  const db = await getDB();

  // Gracefully skip exercises that no longer exist (or were archived) so a stale
  // reference never fails the whole transaction
  const validRows = await db.getAllAsync<{ id: string }>('SELECT id FROM exercises WHERE is_archived = 0;');
  const validIds = new Set(validRows.map((r) => r.id));
  const validItems = items.filter((item) => validIds.has(item.exerciseId));

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM day_templates WHERE day_of_week = ?;', [day]);
    for (let i = 0; i < validItems.length; i++) {
      await db.runAsync(
        'INSERT INTO day_templates (day_of_week, exercise_id, target_sets, sort_order) VALUES (?, ?, ?, ?);',
        [day, validItems[i].exerciseId, validItems[i].targetSets, i]
      );
    }
  });
}

/**
 * Persists only the display order of a day's routine.
 *
 * Called when the user drops a dragged exercise, which happens ahead of (and
 * independently of) the routine's explicit "Save Day Routine": rewriting just
 * the `sort_order` column keeps the stored order in step with the screen
 * without also committing unfinished edits — exercises added or removed since
 * the last save keep whatever membership and target sets are on disk.
 */
export async function updateDayTemplateOrder(
  day: DayOfWeek,
  exerciseIds: string[]
): Promise<void> {
  const db = await getDB();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < exerciseIds.length; i++) {
      await db.runAsync(
        'UPDATE day_templates SET sort_order = ? WHERE day_of_week = ? AND exercise_id = ?;',
        [i, day, exerciseIds[i]]
      );
    }
  });
}

export async function getDayTemplateCounts(): Promise<Record<DayOfWeek, number>> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ day_of_week: DayOfWeek; count: number }>(
    'SELECT day_of_week, COUNT(*) as count FROM day_templates GROUP BY day_of_week;'
  );

  const counts: Record<DayOfWeek, number> = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0,
  };
  for (const r of rows) {
    if (counts[r.day_of_week] !== undefined) {
      counts[r.day_of_week] = r.count;
    }
  }
  return counts;
}

/**
 * Deletes a specific workout log session by primary key ID, together with its sets
 * (ON DELETE CASCADE).
 */
export async function deleteWorkoutLog(logId: number | string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM workout_logs WHERE id = ?;', [String(logId)]);
}

/**
 * Deletes the session currently shown for a day — the newest one, the same
 * record `getWorkoutLogForDate` reads — together with its sets (ON DELETE
 * CASCADE). Earlier sessions logged on the same date are left alone, so
 * discarding this morning's workout cannot take this evening's with it.
 */
export async function deleteWorkoutLogForDate(dateStr: string): Promise<void> {
  const db = await getDB();
  const latest = await fetchLatestLogForDate(db, dateStr);
  if (!latest) return;

  await deleteWorkoutLog(latest.id);
}

// All distinct days with a completed workout (YYYY-MM-DD, ascending).
// Multiple sessions on the same day collapse into a single entry.
export async function getCompletedWorkoutDates(): Promise<string[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ date: string }>(
    'SELECT DISTINCT date FROM workout_logs WHERE completed = 1 ORDER BY date ASC;'
  );
  return rows.map((r) => r.date);
}

/**
 * The sets an exercise was last trained with, read from the single most recent
 * completed session that contains it.
 *
 * A global `LIMIT 10` across all history used to stand in for "last time", but
 * it mixes sessions: a session with fewer sets than the limit gets topped up
 * with rows from the session before it, so the card showed sets that were
 * never trained together on the same day — and made today's target look
 * inconsistent with a past that never happened. The correlated subquery picks
 * one session first; every returned row then comes from that session alone.
 */
export async function getPreviousExerciseSets(exerciseId: string): Promise<{ weight: number; reps: number; setNumber: number }[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ weight: number; reps: number; set_number: number }>(
    `SELECT ws.weight, ws.reps, ws.set_number
     FROM workout_sets ws
     WHERE ws.exercise_id = ? AND ws.workout_log_id = (
       SELECT wl.id FROM workout_logs wl
       JOIN workout_sets s ON s.workout_log_id = wl.id
       WHERE s.exercise_id = ? AND wl.completed = 1
       ORDER BY wl.date DESC, wl.id DESC
       LIMIT 1
     )
     ORDER BY ws.set_number ASC;`,
    [exerciseId, exerciseId]
  );

  return rows.map((r) => ({
    setNumber: r.set_number,
    weight: r.weight,
    reps: r.reps,
  }));
}

/**
 * Persists a finished session.
 *
 * Multi-session days: a session is inserted as its own `workout_logs` row, so
 * logging twice in one day (morning and evening, or a second attempt at a
 * failed day) keeps both. The previous implementation ran
 * `DELETE FROM workout_logs WHERE date = ?` first and silently destroyed the
 * earlier session.
 *
 * Editing is by primary key instead: pass the `logId` of the session being
 * amended (the workout screen loads it and passes it back) and only that row
 * and its sets are replaced. Nothing is ever deleted by date.
 *
 * @param logId - Existing session to amend. Omit to insert a new session.
 * @returns The id of the inserted or updated session.
 */
export async function saveWorkoutLog(
  date: string,
  dayOfWeek: DayOfWeek,
  notes: string,
  sets: { exerciseId: string; setNumber: number; weight: number; reps: number }[],
  logId?: string
): Promise<string> {
  const db = await getDB();

  // Distinguish untouched blank set rows from explicitly invalid sets
  const cleanedSets: { exerciseId: string; setNumber: number; weight: number; reps: number }[] = [];

  for (let index = 0; index < sets.length; index++) {
    const set = sets[index];
    if (!set.exerciseId) {
      throw new InvalidSetError(index, 'missing exercise id');
    }
    if (!Number.isFinite(set.weight) || set.weight < 0) {
      throw new InvalidSetError(index, 'weight must be a finite number >= 0');
    }
    // Untouched blank set: 0 weight and 0 (or absent/negative) reps -> cleanly strip
    if (set.weight === 0 && (!Number.isInteger(set.reps) || set.reps <= 0)) {
      continue;
    }
    // Positive weight combined with invalid/zero/negative reps -> throw InvalidSetError
    if (set.weight > 0 && (!Number.isInteger(set.reps) || set.reps <= 0)) {
      throw new InvalidSetError(index, 'positive weight requires valid reps > 0');
    }
    if (!Number.isInteger(set.setNumber) || set.setNumber <= 0) {
      throw new InvalidSetError(index, 'set number must be a positive integer');
    }
    cleanedSets.push(set);
  }

  // Archived exercises still accept sets: history has to keep the movements it
  // was recorded with. Only an id that is not in the library at all is a real
  // error — the caller is holding a reference the database cannot resolve.
  const requestedIds = Array.from(new Set(cleanedSets.map((set) => set.exerciseId)));
  const knownIds = new Set<string>();
  for (let i = 0; i < requestedIds.length; i += 100) {
    const chunk = requestedIds.slice(i, i + 100);
    const rows = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM exercises WHERE id IN (${chunk.map(() => '?').join(', ')});`,
      chunk
    );
    for (const row of rows) knownIds.add(row.id);
  }
  const unknown = requestedIds.find((id) => !knownIds.has(id));
  if (unknown) throw new UnknownExerciseError(unknown);

  const targetLogId = logId ?? createId('wl_');

  await db.withTransactionAsync(async () => {
    // Atomic upsert: saves or re-saves the workout_log session idempotently
    await db.runAsync(
      `INSERT INTO workout_logs (id, date, day_of_week, notes, completed)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET
         date = excluded.date,
         day_of_week = excluded.day_of_week,
         notes = excluded.notes,
         completed = 1;`,
      [targetLogId, date, dayOfWeek, notes || '']
    );

    // Delete existing sets for this targetLogId so re-saves after crashes are idempotent
    await db.runAsync('DELETE FROM workout_sets WHERE workout_log_id = ?;', [targetLogId]);

    for (const s of cleanedSets) {
      await db.runAsync(
        'INSERT INTO workout_sets (id, workout_log_id, exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?, ?, ?);',
        [createId('ws_'), targetLogId, s.exerciseId, s.setNumber, s.weight, s.reps]
      );
    }
  });

  return targetLogId;
}

/**
 * The session shown for a date: the most recent one logged that day.
 *
 * With multiple sessions per date this is a deliberate choice rather than an
 * incidental one — the dashboard card and the logging screen both need a
 * single, stable answer, and "newest" is the only ordering that does not
 * change as earlier sessions are edited.
 */
async function fetchLatestLogForDate(
  db: SQLite.SQLiteDatabase,
  dateStr: string
): Promise<WorkoutLog | null> {
  const log = await db.getFirstAsync<{ id: string; date: string; day_of_week: DayOfWeek; notes: string; completed: number }>(
    `SELECT id, date, day_of_week, notes, completed FROM workout_logs
     WHERE date = ? AND completed = 1 ORDER BY date DESC, id DESC LIMIT 1;`,
    [dateStr]
  );

  if (!log) return null;

  const sets = await db.getAllAsync<{ id: string; workout_log_id: string; exercise_id: string; set_number: number; weight: number; reps: number }>(
    'SELECT id, workout_log_id, exercise_id, set_number, weight, reps FROM workout_sets WHERE workout_log_id = ? ORDER BY set_number ASC;',
    [log.id]
  );

  return {
    id: log.id,
    date: log.date,
    dayOfWeek: log.day_of_week,
    notes: log.notes,
    completed: Boolean(log.completed),
    sets: sets.map((s) => ({
      id: s.id,
      workoutLogId: s.workout_log_id,
      exerciseId: s.exercise_id,
      setNumber: s.set_number,
      weight: s.weight,
      reps: s.reps,
    })),
  };
}

// Fetch Logged Workout for Date
export async function getWorkoutLogForDate(dateStr: string): Promise<WorkoutLog | null> {
  const db = await getDB();
  return fetchLatestLogForDate(db, dateStr);
}

// Analytics Queries
export async function getExerciseProgress(exerciseId: string): Promise<{ date: string; maxWeight: number; totalVolume: number; totalReps: number }[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ date: string; maxWeight: number; totalVolume: number; totalReps: number }>(
    `SELECT 
        wl.date, 
        MAX(ws.weight) as maxWeight, 
        SUM(ws.weight * ws.reps) as totalVolume,
        SUM(ws.reps) as totalReps
     FROM workout_sets ws
     JOIN workout_logs wl ON ws.workout_log_id = wl.id
     WHERE ws.exercise_id = ? AND wl.completed = 1
     GROUP BY wl.date
     ORDER BY wl.date ASC;`,
    [exerciseId]
  );

  return rows;
}

/**
 * All-time best set by estimated 1RM.
 *
 * The ranking term is `EPLEY_ONE_REP_MAX_SQL` — the same expression
 * `estimateOneRepMax` evaluates in `src/utils/calculations.ts`, including the
 * reps-of-1 rule and two-decimal rounding — so the set this query returns is
 * always the set the app scores highest, instead of a differently-rounded
 * near-tie.
 */
export async function getExerciseBestSet(
  exerciseId: string
): Promise<{ weight: number; reps: number; e1rm: number } | null> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ weight: number; reps: number; e1rm: number }>(
    `SELECT ws.weight, ws.reps, ${EPLEY_ONE_REP_MAX_SQL} as e1rm
     FROM workout_sets ws
     JOIN workout_logs wl ON ws.workout_log_id = wl.id
     WHERE ws.exercise_id = ? AND wl.completed = 1 AND ws.reps > 0 AND ws.weight > 0
     ORDER BY e1rm DESC
     LIMIT 1;`,
    [exerciseId]
  );
  if (rows.length === 0) return null;

  return { weight: rows[0].weight, reps: rows[0].reps, e1rm: rows[0].e1rm };
}

/**
 * Trailing 4-week volume against the 4 weeks before it.
 *
 * Both windows are exactly 28 days of calendar dates — `[today - 27, today]`
 * and `[today - 55, today - 28]` — so the two totals compare like with like. A
 * single `today - 28` cutoff put 29 days in the recent bucket and 28 in the
 * prior one, which inflated recent volume by roughly 3.5% on its own. The
 * `>= priorCutoff` filter also stops pre-window history from being grouped into
 * an "old" bucket whose sum was then thrown away.
 */
export async function getExerciseVolumeTrend(
  exerciseId: string
): Promise<{ recentVolume: number; priorVolume: number }> {
  const db = await getDB();
  const recentStart = new Date();
  recentStart.setDate(recentStart.getDate() - 27);
  const priorStart = new Date();
  priorStart.setDate(priorStart.getDate() - 55);
  const today = formatISODate(new Date());
  const recentStartStr = formatISODate(recentStart);
  const priorStartStr = formatISODate(priorStart);

  const rows = await db.getAllAsync<{ volume: number | null; bucket: string }>(
    `SELECT
       CASE WHEN wl.date >= ? THEN 'recent' ELSE 'prior' END as bucket,
       SUM(ws.weight * ws.reps) as volume
     FROM workout_sets ws
     JOIN workout_logs wl ON ws.workout_log_id = wl.id
     WHERE ws.exercise_id = ? AND wl.completed = 1
       AND wl.date >= ? AND wl.date <= ?
     GROUP BY bucket;`,
    [recentStartStr, exerciseId, priorStartStr, today]
  );

  let recentVolume = 0;
  let priorVolume = 0;
  for (const r of rows) {
    if (r.bucket === 'recent') recentVolume = r.volume ?? 0;
    else if (r.bucket === 'prior') priorVolume = r.volume ?? 0;
  }
  return { recentVolume, priorVolume };
}

export async function getComplianceStats(daysLimit: number = 30): Promise<{ totalDays: number; scheduledDays: number; completedDays: number; streak: number }> {
  const db = await getDB();
  const split = await getWeeklySplit();
  
  const today = new Date();
  let completedCount = 0;
  let scheduledCount = 0;

  const logs = await db.getAllAsync<{ date: string }>(
    'SELECT DISTINCT date FROM workout_logs WHERE completed = 1 ORDER BY date DESC;'
  );
  const completedDates = new Set(logs.map((l) => l.date));

  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as DayOfWeek[];

  for (let i = 0; i < daysLimit; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = formatISODate(d);
    const dayOfWeekStr = daysMap[d.getDay()];

    if ((split[dayOfWeekStr] || []).length > 0) scheduledCount++;
    if (completedDates.has(dateStr)) completedCount++;
  }

  // The window above only scopes the two counts; the streak itself is measured
  // over the whole history, by the same rule the streak sheet uses — a run
  // longer than `daysLimit` must not be reported at the window's edge.
  const scheduledDays = DAYS_OF_WEEK.filter((day) => (split[day] || []).length > 0);

  return {
    totalDays: daysLimit,
    scheduledDays: scheduledCount,
    completedDays: completedCount,
    streak: calculateWorkoutStreak(logs.map((l) => l.date), today, scheduledDays),
  };
}
