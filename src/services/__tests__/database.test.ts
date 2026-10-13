/**
 * Integration tests for the SQLite data layer.
 *
 * `expo-sqlite` is replaced by the manual mock in `__mocks__/expo-sqlite.ts`,
 * which runs a real in-memory SQLite engine — so foreign keys, cascades, and
 * transaction rollbacks under test are the genuine database behaviors.
 */
import type * as DatabaseModule from '../database';
import type { MockSQLiteDatabase } from '../../../__mocks__/expo-sqlite';
import { formatISODate } from '../../utils/dateUtils';
import { estimateOneRepMax } from '../../utils/calculations';

type SqliteMock = {
  openDatabaseSync: (name: string) => MockSQLiteDatabase;
  __resetDatabases: () => void;
  __executedStatements: (name: string) => string[];
};

/** Fresh module registry per test => the DB module re-initializes from scratch. */
const sqlite = () => jest.requireMock('expo-sqlite') as unknown as SqliteMock;
const loadDbModule = () => require('../database') as typeof DatabaseModule;

const MUSCLE_GROUP_COUNT = 9; // Default seeded groups

/** YYYY-MM-DD for `days` days before today, matching the service's own date math. */
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatISODate(d);
}

async function freshDatabase(): Promise<{
  db: typeof DatabaseModule;
  handle: MockSQLiteDatabase;
}> {
  const db = loadDbModule();
  return { db, handle: (await db.getDB()) as unknown as MockSQLiteDatabase };
}

describe('database service', () => {
  beforeEach(() => {
    sqlite().__resetDatabases();
    jest.resetModules();
  });

  /** All exercise ids referenced by logged sets and routine templates. */
  async function linkedExerciseIds(handle: MockSQLiteDatabase): Promise<string[]> {
    const sets = await handle.getAllAsync<{ exercise_id: string }>(
      'SELECT exercise_id FROM workout_sets;'
    );
    const templates = await handle.getAllAsync<{ exercise_id: string }>(
      'SELECT exercise_id FROM day_templates;'
    );
    return [...sets, ...templates].map((row) => row.exercise_id);
  }

  describe('schema initialization and versioning', () => {
    it('creates the base schema, enables foreign keys, and stamps user_version = 2', async () => {
      const { db, handle } = await freshDatabase();

      const version = await handle.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
      const foreignKeys = await handle.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys;');
      const tables = await handle.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"
      );

      expect(db.SCHEMA_VERSION).toBe(2);
      expect(version?.user_version).toBe(2);
      expect(foreignKeys?.foreign_keys).toBe(1);
      expect(tables.map((t) => t.name)).toEqual(
        expect.arrayContaining([
          'muscle_groups',
          'exercises',
          'weekly_split',
          'workout_logs',
          'workout_sets',
          'day_templates',
        ])
      );
    });

    it('creates the relational indexes the analytics joins depend on', async () => {
      const { handle } = await freshDatabase();

      const indexes = await handle.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name;"
      );

      expect(indexes.map((i) => i.name)).toEqual(
        expect.arrayContaining([
          'idx_workout_sets_log_id',
          'idx_workout_sets_exercise_id',
          'idx_workout_sets_composite',
          'idx_workout_logs_date',
          'idx_exercises_active_name',
        ])
      );
    });

    it('seeds the default muscle groups exactly once', async () => {
      const { db } = await freshDatabase();
      expect(await db.getMuscleGroups()).toHaveLength(MUSCLE_GROUP_COUNT);
    });

    it('reuses a single connection for every query (initialization runs once)', async () => {
      const { db, handle } = await freshDatabase();
      expect(await db.getDB()).toBe(handle);
    });

    it('keeps existing data and the stamped version across an app relaunch', async () => {
      const first = await freshDatabase();
      const exercise = await first.db.addExercise('Bench Press', 'Chest');
      await first.db.saveWorkoutLog('2026-09-01', 'Tuesday', 'heavy', [
        { exerciseId: exercise.id, setNumber: 1, weight: 80, reps: 5 },
      ]);

      // Simulate a relaunch: new module registry, same underlying database
      jest.resetModules();
      const second = await freshDatabase();

      expect(await second.db.getAllExercises()).toHaveLength(1);
      expect((await second.handle.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version).toBe(2);
      // Seeding is idempotent, so groups are neither duplicated nor wiped
      expect(await second.db.getMuscleGroups()).toHaveLength(MUSCLE_GROUP_COUNT);
    });

    it('re-enables foreign keys on every launch, not just the first', async () => {
      // SQLite scopes this pragma to the connection and defaults it to OFF, and
      // the mock's engine (node:sqlite) defaults it to ON — so reset it here to
      // emulate what a real relaunch hands to initSchema.
      const first = await freshDatabase();
      await first.handle.execAsync('PRAGMA foreign_keys = OFF;');

      jest.resetModules();
      const second = await freshDatabase();

      const pragma = await second.handle.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys;');
      expect(pragma?.foreign_keys).toBe(1);
    });

    it('opens every connection in WAL mode with a busy timeout', async () => {
      // SQLite's defaults (`journal_mode = delete`, `busy_timeout = 0`) make any
      // query that collides with a concurrent writer fail immediately with
      // "database is locked" instead of waiting its turn. Assert the connection
      // is configured for that collision, then read the settings back from the
      // engine that applies them.
      const { DB_NAME } = loadDbModule();
      const { handle } = await freshDatabase();

      const configuration = sqlite().__executedStatements(DB_NAME).join('\n');
      expect(configuration).toMatch(/journal_mode\s*=\s*WAL/i);
      expect(configuration).toMatch(/busy_timeout\s*=\s*5000/i);

      // The engine holds the timeout it was given (WAL itself is a file
      // property, so an in-memory database reports `memory` here).
      const busyTimeout = await handle.getFirstAsync<{ timeout: number }>('PRAGMA busy_timeout;');
      expect(busyTimeout?.timeout).toBe(5000);
    });

    it('archives a deleted exercise on every launch, not just the first', async () => {
      const first = await freshDatabase();
      const exercise = await first.db.addExercise('Deadlift', 'Back');
      await first.db.saveDayTemplate('Monday', [{ exerciseId: exercise.id, targetSets: 3 }]);
      await first.db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: exercise.id, setNumber: 1, weight: 120, reps: 5 },
      ]);

      // Relaunch with the pragma at its connection default, data intact
      await first.handle.execAsync('PRAGMA foreign_keys = OFF;');
      jest.resetModules();
      const second = await freshDatabase();

      await second.db.deleteExercise(exercise.id);

      // The archive flag survives the relaunch and takes the exercise out of
      // the catalog and the routine...
      expect(await second.db.getAllExercises()).toEqual([]);
      expect(await second.db.getDayTemplate('Monday')).toEqual([]);

      // ...while the sets it logged are still readable, which is the whole
      // point of archiving instead of deleting
      const log = await second.db.getWorkoutLogForDate('2026-09-01');
      expect(log?.sets.map((s) => [s.exerciseId, s.weight])).toEqual([[exercise.id, 120]]);
      const archived = await second.handle.getFirstAsync<{ is_archived: number }>(
        'SELECT is_archived FROM exercises WHERE id = ?;',
        [exercise.id]
      );
      expect(archived?.is_archived).toBe(1);
    });

    it('adds the soft-delete column to a version 1 database without losing history', async () => {
      // A version 1 database is the shape every currently-installed build
      // wrote: no `is_archived`, no user_version 2. The migration has to add
      // the column in place and leave the logged history untouched.
      const { DB_NAME } = loadDbModule();
      const previous = sqlite().openDatabaseSync(DB_NAME);
      await previous.execAsync(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE muscle_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
        CREATE TABLE exercises (
          id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, muscleGroup TEXT, createdAt TEXT
        );
        CREATE TABLE workout_logs (
          id TEXT PRIMARY KEY, date TEXT NOT NULL, day_of_week TEXT NOT NULL, notes TEXT, completed INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE workout_sets (
          id TEXT PRIMARY KEY,
          workout_log_id TEXT NOT NULL,
          exercise_id TEXT NOT NULL,
          set_number INTEGER NOT NULL,
          weight REAL NOT NULL,
          reps INTEGER NOT NULL,
          FOREIGN KEY (workout_log_id) REFERENCES workout_logs (id) ON DELETE CASCADE,
          FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
        );
        CREATE TABLE day_templates (
          day_of_week TEXT NOT NULL,
          exercise_id TEXT NOT NULL,
          target_sets INTEGER NOT NULL DEFAULT 3,
          sort_order INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (day_of_week, exercise_id),
          FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
        );
        INSERT INTO exercises (id, name, muscleGroup, createdAt)
          VALUES ('ex_v1', 'Bench Press', 'Chest', '2026-01-01T00:00:00.000Z');
        INSERT INTO workout_logs (id, date, day_of_week, notes, completed)
          VALUES ('wl_v1', '2026-01-02', 'Friday', '', 1);
        INSERT INTO workout_sets (id, workout_log_id, exercise_id, set_number, weight, reps)
          VALUES ('ws_v1', 'wl_v1', 'ex_v1', 1, 80, 8);
        PRAGMA user_version = 1;
        PRAGMA foreign_keys = ON;
      `);

      const { db: migrated, handle } = await freshDatabase();

      const columns = await handle.getAllAsync<{ name: string }>('PRAGMA table_info(exercises);');
      expect(columns.map((c) => c.name)).toContain('is_archived');
      expect((await handle.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version).toBe(2);

      // History survives the migration and the exercise is still listed
      expect(await migrated.getAllExercises()).toHaveLength(1);
      const log = await migrated.getWorkoutLogForDate('2026-01-02');
      expect(log?.sets.map((s) => s.weight)).toEqual([80]);

      // ...and the new column is what a delete flips, not the row itself
      await migrated.deleteExercise('ex_v1');
      expect(await migrated.getAllExercises()).toEqual([]);
      expect(await linkedExerciseIds(handle)).toEqual(['ex_v1']);
    });

    it('repairs a pre-versioning legacy database while stamping the current version', async () => {
      // Build a legacy database: old `exercises` shape, child FKs pointing at
      // the renamed legacy table, and no schema version at all.
      const { DB_NAME } = loadDbModule();
      const legacy = sqlite().openDatabaseSync(DB_NAME);
      await legacy.execAsync(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE muscle_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
        CREATE TABLE exercises (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          muscle_group_id TEXT,
          FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups (id) ON DELETE CASCADE
        );
        CREATE TABLE workout_logs (
          id TEXT PRIMARY KEY, date TEXT NOT NULL, day_of_week TEXT NOT NULL, notes TEXT, completed INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE workout_sets (
          id TEXT PRIMARY KEY,
          workout_log_id TEXT NOT NULL,
          exercise_id TEXT NOT NULL,
          set_number INTEGER NOT NULL,
          weight REAL NOT NULL,
          reps INTEGER NOT NULL,
          FOREIGN KEY (workout_log_id) REFERENCES workout_logs (id) ON DELETE CASCADE,
          FOREIGN KEY (exercise_id) REFERENCES exercises_legacy (id) ON DELETE CASCADE
        );
        CREATE TABLE day_templates (
          day_of_week TEXT NOT NULL,
          exercise_id TEXT NOT NULL,
          target_sets INTEGER NOT NULL DEFAULT 3,
          sort_order INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (day_of_week, exercise_id),
          FOREIGN KEY (exercise_id) REFERENCES exercises_legacy (id) ON DELETE CASCADE
        );
        INSERT INTO muscle_groups (id, name) VALUES ('mg_biceps', 'Biceps');
        INSERT INTO exercises (id, name, muscle_group_id) VALUES ('ex_old', 'Legacy Curl', 'mg_biceps');
        INSERT INTO workout_logs (id, date, day_of_week, notes, completed) VALUES ('wl_old', '2026-01-02', 'Friday', '', 1);
        INSERT INTO workout_sets (id, workout_log_id, exercise_id, set_number, weight, reps)
          VALUES ('ws_old', 'wl_old', 'ex_old', 1, 20, 10);
        PRAGMA foreign_keys = ON;
      `);

      const { db: initialized, handle } = await freshDatabase();

      // Legacy column gone, unified columns present
      const columns = await handle.getAllAsync<{ name: string }>('PRAGMA table_info(exercises);');
      const columnNames = columns.map((c) => c.name);
      expect(columnNames).toContain('muscleGroup');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).not.toContain('muscle_group_id');

      // Child foreign keys now point at the live exercises table
      const setFks = await handle.getAllAsync<{ table: string }>('PRAGMA foreign_key_list(workout_sets);');
      const templateFks = await handle.getAllAsync<{ table: string }>(
        'PRAGMA foreign_key_list(day_templates);'
      );
      expect(setFks.some((f) => f.table === 'exercises')).toBe(true);
      expect(templateFks.some((f) => f.table === 'exercises')).toBe(true);

      // The repair rebuilds the unified library table, so user exercises from
      // the pre-versioning schema are intentionally not carried over
      expect(await initialized.getAllExercises()).toEqual([]);

      // Orphaned set rows are cleaned up; the workout log itself survives
      const log = await initialized.getWorkoutLogForDate('2026-01-02');
      expect(log).not.toBeNull();
      expect(log?.sets).toEqual([]);

      const version = await handle.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
      expect(version?.user_version).toBe(initialized.SCHEMA_VERSION);
    });
  });

  describe('foreign key enforcement', () => {
    it('rejects a workout set that references a missing workout log', async () => {
      const { db, handle } = await freshDatabase();
      const exercise = await db.addExercise('Squat', 'Legs');

      await expect(
        handle.runAsync(
          'INSERT INTO workout_sets (id, workout_log_id, exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?, ?, ?);',
          ['ws_orphan', 'wl_missing', exercise.id, 1, 100, 5]
        )
      ).rejects.toThrow(/FOREIGN KEY constraint failed/i);
    });

    it('rejects a weekly split entry for an unknown muscle group', async () => {
      const { db, handle } = await freshDatabase();

      await expect(
        handle.runAsync('INSERT INTO weekly_split (day_of_week, muscle_group_id) VALUES (?, ?);', [
          'Monday',
          'mg_does_not_exist',
        ])
      ).rejects.toThrow(/FOREIGN KEY constraint failed/i);

      expect(await db.getWeeklySplit()).toEqual({
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: [],
      });
    });

    it('archives an exercise instead of cascading into its routines and logged sets', async () => {
      const { db, handle } = await freshDatabase();
      const exercise = await db.addExercise('Deadlift', 'Back');
      const other = await db.addExercise('Row', 'Back');

      await db.saveDayTemplate('Monday', [
        { exerciseId: exercise.id, targetSets: 3 },
        { exerciseId: other.id, targetSets: 4 },
      ]);
      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: exercise.id, setNumber: 1, weight: 120, reps: 3 },
        { exerciseId: other.id, setNumber: 2, weight: 60, reps: 8 },
      ]);

      await db.deleteExercise(exercise.id);

      // Gone from the catalog and the routine the user would train next...
      expect((await db.getAllExercises()).map((e) => e.id)).toEqual([other.id]);
      expect((await db.getDayTemplate('Monday')).map((t) => t.exercise.id)).toEqual([other.id]);

      // ...but every row it ever logged is still there, because a hard delete
      // used to cascade into `workout_sets` and erase the progression data
      // while leaving the parent log (and its streak count) in place.
      const log = await db.getWorkoutLogForDate('2026-09-01');
      expect(log?.sets.map((s) => [s.exerciseId, s.weight])).toEqual([
        [exercise.id, 120],
        [other.id, 60],
      ]);
      expect((await db.getExerciseProgress(exercise.id)).map((p) => p.totalVolume)).toEqual([360]);
      expect(await linkedExerciseIds(handle)).toEqual(
        expect.arrayContaining([exercise.id, other.id])
      );
    });

    it('keeps an exercise out of the catalog and routine setup while it is archived', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      const fly = await db.addExercise('Cable Fly', 'Chest');

      await db.deleteExercise(bench.id);

      expect(await db.getAllExercises()).toEqual([expect.objectContaining({ id: fly.id })]);
      expect(await db.getExercisesByMuscleGroup('Chest')).toEqual([
        expect.objectContaining({ id: fly.id }),
      ]);

      // A routine rebuilt while the exercise is archived cannot re-add it
      await db.saveDayTemplate('Monday', [
        { exerciseId: bench.id, targetSets: 3 },
        { exerciseId: fly.id, targetSets: 3 },
      ]);
      expect((await db.getDayTemplate('Monday')).map((t) => t.exercise.id)).toEqual([fly.id]);
    });
  });

  describe('routine day templates', () => {
    it('stores exercises with their target sets and preserves insertion order', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      const fly = await db.addExercise('Cable Fly', 'Chest');
      const dip = await db.addExercise('Dip', 'Triceps');

      await db.saveDayTemplate('Monday', [
        { exerciseId: bench.id, targetSets: 4 },
        { exerciseId: fly.id, targetSets: 3 },
        { exerciseId: dip.id, targetSets: 2 },
      ]);

      const template = await db.getDayTemplate('Monday');
      expect(template.map((t) => [t.exercise.name, t.targetSets])).toEqual([
        ['Bench Press', 4],
        ['Cable Fly', 3],
        ['Dip', 2],
      ]);
    });

    it('replaces the previous routine for that day instead of duplicating it', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      const fly = await db.addExercise('Cable Fly', 'Chest');

      await db.saveDayTemplate('Monday', [{ exerciseId: bench.id, targetSets: 3 }]);
      await db.saveDayTemplate('Monday', [{ exerciseId: fly.id, targetSets: 5 }]);

      const template = await db.getDayTemplate('Monday');
      expect(template).toHaveLength(1);
      expect(template[0].exercise.id).toBe(fly.id);
      expect(template[0].targetSets).toBe(5);
    });

    it('skips exercises that no longer exist instead of failing the whole write', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      await db.saveDayTemplate('Tuesday', [
        { exerciseId: bench.id, targetSets: 3 },
        { exerciseId: 'ex_deleted_long_ago', targetSets: 3 },
      ]);

      const template = await db.getDayTemplate('Tuesday');
      expect(template.map((t) => t.exercise.id)).toEqual([bench.id]);
    });

    it('reports configured exercise counts per day', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      const squat = await db.addExercise('Squat', 'Legs');

      await db.saveDayTemplate('Monday', [{ exerciseId: bench.id, targetSets: 3 }]);
      await db.saveDayTemplate('Wednesday', [
        { exerciseId: bench.id, targetSets: 3 },
        { exerciseId: squat.id, targetSets: 5 },
      ]);

      const counts = await db.getDayTemplateCounts();
      expect(counts.Monday).toBe(1);
      expect(counts.Wednesday).toBe(2);
      expect(counts.Friday).toBe(0);
    });

    it('re-orders a stored routine without touching its target sets', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      const fly = await db.addExercise('Cable Fly', 'Chest');
      const dip = await db.addExercise('Dip', 'Triceps');

      await db.saveDayTemplate('Monday', [
        { exerciseId: bench.id, targetSets: 4 },
        { exerciseId: fly.id, targetSets: 3 },
        { exerciseId: dip.id, targetSets: 2 },
      ]);

      // The dragged order the routine builder persists on drop
      await db.updateDayTemplateOrder('Monday', [dip.id, bench.id, fly.id]);

      const template = await db.getDayTemplate('Monday');
      expect(template.map((t) => [t.exercise.name, t.targetSets])).toEqual([
        ['Dip', 2],
        ['Bench Press', 4],
        ['Cable Fly', 3],
      ]);
    });

    it('ignores exercises the routine does not contain when re-ordering', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      const fly = await db.addExercise('Cable Fly', 'Chest');
      const unsaved = await db.addExercise('Dip', 'Triceps');

      await db.saveDayTemplate('Monday', [
        { exerciseId: bench.id, targetSets: 3 },
        { exerciseId: fly.id, targetSets: 3 },
      ]);

      // `unsaved` was added to the builder but never saved: only the stored rows
      // are re-ordered, and the row that is not there stays absent
      await expect(
        db.updateDayTemplateOrder('Monday', [unsaved.id, fly.id, bench.id])
      ).resolves.toBeUndefined();

      expect((await db.getDayTemplate('Monday')).map((t) => t.exercise.id)).toEqual([
        fly.id,
        bench.id,
      ]);
    });
  });

  describe('workout set logging', () => {
    it('persists a session with its sets and reads it back in set order', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      const logId = await db.saveWorkoutLog('2026-09-01', 'Tuesday', 'felt strong', [
        { exerciseId: bench.id, setNumber: 2, weight: 85, reps: 6 },
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);

      const log = await db.getWorkoutLogForDate('2026-09-01');
      expect(log?.id).toBe(logId);
      expect(log?.completed).toBe(true);
      expect(log?.notes).toBe('felt strong');
      expect(log?.sets.map((s) => [s.setNumber, s.weight, s.reps])).toEqual([
        [1, 80, 8],
        [2, 85, 6],
      ]);
    });

    it('rejects an invalid set instead of dropping it from a saved session', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      const valid = { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 };

      // Zero reps is input the screen already filters out, and a negative
      // weight is not a lift: both used to be skipped silently while the call
      // still resolved with a log id, so the caller could not tell a complete
      // save from an empty one.
      const rejected = [
        { ...valid, reps: 0 },
        { ...valid, reps: -3 },
        { ...valid, weight: -5 },
        { ...valid, setNumber: 0 },
        { ...valid, exerciseId: '' },
      ];
      for (const set of rejected) {
        await expect(db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [set])).rejects.toThrow(
          db.InvalidSetError
        );
      }

      // Nothing was written by the rejected calls
      expect(await db.getWorkoutLogForDate('2026-09-01')).toBeNull();
      expect(await (await db.getDB()).getAllAsync('SELECT id FROM workout_sets;')).toEqual([]);

      // The same payload without the bad row saves cleanly
      await expect(
        db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [valid])
      ).resolves.toEqual(expect.any(String));
      expect((await db.getWorkoutLogForDate('2026-09-01'))?.sets).toHaveLength(1);
    });

    it('cleanly strips untouched blank set rows (0 weight and 0 reps)', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
        { exerciseId: bench.id, setNumber: 2, weight: 0, reps: 0 },
      ]);

      const log = await db.getWorkoutLogForDate('2026-09-01');
      expect(log?.sets).toHaveLength(1);
      expect(log?.sets[0].weight).toBe(80);
      expect(log?.sets[0].reps).toBe(8);
    });

    it('preserves valid bodyweight sets with 0 weight and positive reps', async () => {
      const { db } = await freshDatabase();
      const pullups = await db.addExercise('Pull-ups', 'Back');

      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: pullups.id, setNumber: 1, weight: 0, reps: 10 },
      ]);

      const log = await db.getWorkoutLogForDate('2026-09-01');
      expect(log?.sets).toHaveLength(1);
      expect(log?.sets[0].weight).toBe(0);
      expect(log?.sets[0].reps).toBe(10);
    });

    it('rejects a set for an exercise the library does not have', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      // A reference the database cannot resolve is a caller bug, not a set to
      // discard: the old behaviour stored the session without those rows and
      // returned success.
      await expect(
        db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
          { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
          { exerciseId: 'ex_ghost', setNumber: 2, weight: 50, reps: 5 },
        ])
      ).rejects.toThrow(db.UnknownExerciseError);

      expect(await db.getWorkoutLogForDate('2026-09-01')).toBeNull();
    });

    it('keeps both sessions when the same date is logged twice', async () => {
      const { db, handle } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      const morning = await db.saveWorkoutLog('2026-09-01', 'Tuesday', 'morning', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);
      const evening = await db.saveWorkoutLog('2026-09-01', 'Tuesday', 'evening', [
        { exerciseId: bench.id, setNumber: 1, weight: 70, reps: 12 },
      ]);

      // The old implementation deleted every log for the date before inserting,
      // so the morning session (and its sets) vanished without a warning.
      expect(evening).not.toBe(morning);
      const logs = await handle.getAllAsync<{ id: string; notes: string }>(
        'SELECT id, notes FROM workout_logs ORDER BY id ASC;'
      );
      expect(logs.map((l) => l.notes).sort()).toEqual(['evening', 'morning']);

      const sets = await handle.getAllAsync<{ workout_log_id: string }>(
        'SELECT workout_log_id FROM workout_sets;'
      );
      expect(sets.map((s) => s.workout_log_id).sort()).toEqual([morning, evening].sort());

      // Both sessions count toward the day exactly once
      expect(await db.getCompletedWorkoutDates()).toEqual(['2026-09-01']);

      // ...and the day reads back as its newest session
      expect((await db.getWorkoutLogForDate('2026-09-01'))?.id).toBe(evening);
    });

    it('amends a session by id without touching another session on the same date', async () => {
      const { db, handle } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      const first = await db.saveWorkoutLog('2026-09-01', 'Tuesday', 'first', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);
      await db.saveWorkoutLog('2026-09-01', 'Tuesday', 'second', [
        { exerciseId: bench.id, setNumber: 1, weight: 90, reps: 5 },
      ]);

      // The workout screen passes back the id it loaded, which amends that one
      // session in place — no blanket delete by date.
      const amended = await db.saveWorkoutLog(
        '2026-09-01',
        'Tuesday',
        'first (edited)',
        [{ exerciseId: bench.id, setNumber: 1, weight: 82.5, reps: 8 }],
        first
      );
      expect(amended).toBe(first);

      const logs = await handle.getAllAsync<{ id: string; notes: string }>(
        'SELECT id, notes FROM workout_logs ORDER BY id ASC;'
      );
      expect(logs).toHaveLength(2);
      expect(logs.find((l) => l.id === first)?.notes).toBe('first (edited)');

      const sets = await handle.getAllAsync<{ workout_log_id: string; weight: number }>(
        'SELECT workout_log_id, weight FROM workout_sets ORDER BY weight ASC;'
      );
      expect(sets).toEqual([
        { workout_log_id: first, weight: 82.5 },
        { workout_log_id: logs.find((l) => l.id !== first)!.id, weight: 90 },
      ]);
    });

    it('deletes a logged day together with its sets', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);

      await db.deleteWorkoutLogForDate('2026-09-01');

      expect(await db.getWorkoutLogForDate('2026-09-01')).toBeNull();
      const sets = await (await db.getDB()).getAllAsync<{ id: string }>('SELECT id FROM workout_sets;');
      expect(sets).toHaveLength(0);
    });

    it('deletes only the newest session of a multi-session day', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      const morning = await db.saveWorkoutLog('2026-09-01', 'Tuesday', 'morning', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);
      const evening = await db.saveWorkoutLog('2026-09-01', 'Tuesday', 'evening', [
        { exerciseId: bench.id, setNumber: 1, weight: 70, reps: 12 },
      ]);

      await db.deleteWorkoutLogForDate('2026-09-01');

      const remaining = await db.getWorkoutLogForDate('2026-09-01');
      expect(remaining?.id).toBe(morning);
      expect(remaining?.notes).toBe('morning');
      expect(remaining?.sets).toHaveLength(1);
      expect(evening).not.toBe(morning);
    });

    it('deletes a workout log session directly by logId', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      const logId = await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);

      await db.deleteWorkoutLog(logId);

      expect(await db.getWorkoutLogForDate('2026-09-01')).toBeNull();
      const sets = await (await db.getDB()).getAllAsync<{ id: string }>('SELECT id FROM workout_sets;');
      expect(sets).toHaveLength(0);
    });

    it('saves idempotently with pre-allocated logId without duplicating logs or sets', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      const preAllocatedId = db.createWorkoutLogId();

      const first = await db.saveWorkoutLog(
        '2026-09-01',
        'Tuesday',
        'initial',
        [{ exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 }],
        preAllocatedId
      );
      expect(first).toBe(preAllocatedId);

      // Retry (e.g. app crashed after commit but before draft cleared)
      const second = await db.saveWorkoutLog(
        '2026-09-01',
        'Tuesday',
        'initial',
        [{ exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 }],
        preAllocatedId
      );
      expect(second).toBe(preAllocatedId);

      const logs = await (await db.getDB()).getAllAsync<{ id: string }>('SELECT id FROM workout_logs;');
      expect(logs).toHaveLength(1);

      const sets = await (await db.getDB()).getAllAsync<{ id: string }>('SELECT id FROM workout_sets;');
      expect(sets).toHaveLength(1);
    });

    it('lists distinct completed workout days for streak analytics', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      await db.saveWorkoutLog('2026-09-03', 'Thursday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);
      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);
      await db.saveWorkoutLog('2026-09-01', 'Tuesday', 'same day second session', [
        { exerciseId: bench.id, setNumber: 1, weight: 82, reps: 8 },
      ]);

      expect(await db.getCompletedWorkoutDates()).toEqual(['2026-09-01', '2026-09-03']);
    });
  });

  describe('transaction rollback', () => {
    it('rolls the whole weekly split back when one entry violates a foreign key', async () => {
      const { db } = await freshDatabase();
      await db.saveWeeklySplit({
        Monday: ['mg_chest'],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: [],
      });

      await expect(
        db.saveWeeklySplit({
          Monday: ['mg_legs'],
          Tuesday: ['mg_missing_group'],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
          Sunday: [],
        })
      ).rejects.toThrow(/FOREIGN KEY constraint failed/i);

      // The DELETE inside the failed transaction was rolled back too
      const split = await db.getWeeklySplit();
      expect(split.Monday).toEqual(['mg_chest']);
      expect(split.Tuesday).toEqual([]);
    });

    it('leaves no partial routine template when a write fails mid-transaction', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      await db.saveDayTemplate('Monday', [{ exerciseId: bench.id, targetSets: 3 }]);

      // Force a failure inside the transaction by inserting a duplicate primary
      // key: the transaction must roll back to the pre-write state.
      const handle = (await db.getDB()) as unknown as MockSQLiteDatabase;
      await expect(
        handle.withTransactionAsync(async () => {
          await handle.runAsync('DELETE FROM day_templates WHERE day_of_week = ?;', ['Monday']);
          await handle.runAsync(
            'INSERT INTO day_templates (day_of_week, exercise_id, target_sets, sort_order) VALUES (?, ?, ?, ?);',
            ['Monday', bench.id, 9, 0]
          );
          await handle.runAsync(
            'INSERT INTO day_templates (day_of_week, exercise_id, target_sets, sort_order) VALUES (?, ?, ?, ?);',
            ['Monday', bench.id, 7, 1]
          );
        })
      ).rejects.toThrow();

      const template = await db.getDayTemplate('Monday');
      expect(template).toHaveLength(1);
      expect(template[0].targetSets).toBe(3);
    });
  });

  describe('analytics queries', () => {
    it('aggregates per-session max weight and volume for one exercise', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
        { exerciseId: bench.id, setNumber: 2, weight: 85, reps: 6 },
      ]);
      await db.saveWorkoutLog('2026-09-08', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 90, reps: 5 },
      ]);

      const progress = await db.getExerciseProgress(bench.id);
      expect(progress).toEqual([
        { date: '2026-09-01', maxWeight: 85, totalVolume: 1150, totalReps: 14 },
        { date: '2026-09-08', maxWeight: 90, totalVolume: 450, totalReps: 5 },
      ]);
    });

    it('finds the all-time best set by estimated 1RM', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 100, reps: 1 },
      ]);
      await db.saveWorkoutLog('2026-09-08', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 90, reps: 8 }, // e1RM 114
      ]);

      const best = await db.getExerciseBestSet(bench.id);
      expect(best).toEqual({ weight: 90, reps: 8, e1rm: 114 });
    });

    it('scores the best set with the same Epley formula the app displays', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      // Two sets whose ranking the raw formula and the app's formula agree on,
      // so the assertion can be about the *value*: the old query rounded the
      // estimate (`Math.round(116.67)` = 117) while the TypeScript formula keeps
      // two decimals (116.67), so the "best set" card could show a 1RM that no
      // calculation in the app ever produced.
      await db.saveWorkoutLog('2026-09-08', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 100, reps: 5 },
      ]);

      const best = await db.getExerciseBestSet(bench.id);
      expect(best).toEqual({ weight: 100, reps: 5, e1rm: 116.67 });
      expect(best?.e1rm).toBe(estimateOneRepMax(100, 5));

      // A single rep scores as the exact weight it was lifted at, which is the
      // rule that makes `estimateOneRepMax(w, 1) === w`
      await db.saveWorkoutLog('2026-09-15', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 120, reps: 1 },
      ]);
      const single = await db.getExerciseBestSet(bench.id);
      expect(single).toEqual({ weight: 120, reps: 1, e1rm: 120 });
      expect(single?.e1rm).toBe(estimateOneRepMax(120, 1));
    });

    it('returns null when an exercise has no logged sets yet', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      expect(await db.getExerciseBestSet(bench.id)).toBeNull();
      expect(await db.getExerciseProgress(bench.id)).toEqual([]);
      expect(await db.getPreviousExerciseSets(bench.id)).toEqual([]);
      expect(await db.getExerciseVolumeTrend(bench.id)).toEqual({ recentVolume: 0, priorVolume: 0 });
    });

    it('splits training volume into two equal 28-day windows', async () => {
      const { db, handle } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      // Boundaries are counted in calendar dates: the recent window is
      // [today - 27, today] and the prior window [today - 55, today - 28],
      // 28 days each. A single `today - 28` cutoff used to put 29 days in the
      // recent bucket, inflating it by roughly 3.5% against the prior one.
      const recentStart = daysAgo(27);
      const priorStart = daysAgo(55);
      const beforePriorWindow = daysAgo(56);

      for (const [date, weight] of [
        [daysAgo(0), 10], // last day of the recent window
        [recentStart, 20], // first day of the recent window
        [daysAgo(20), 40], // inside the recent window
        [daysAgo(28), 1000], // first day of the prior window
        [priorStart, 2000], // ...and its last day
        [beforePriorWindow, 999], // outside both windows
      ] as [string, number][]) {
        await db.saveWorkoutLog(date, 'Tuesday', '', [
          { exerciseId: bench.id, setNumber: 1, weight, reps: 1 },
        ]);
      }

      // recent = 10 + 20 + 40, prior = 1000 + 2000, and the 999 outside both
      // windows is filtered out before the aggregation rather than grouped and
      // discarded after it.
      expect(await db.getExerciseVolumeTrend(bench.id)).toEqual({
        recentVolume: 70,
        priorVolume: 3000,
      });

      const windowDates = await handle.getAllAsync<{ date: string }>(
        `SELECT date FROM workout_logs WHERE date >= ? AND date <= ? ORDER BY date ASC;`,
        [priorStart, daysAgo(0)]
      );
      expect(windowDates).toHaveLength(5);
    });

    it('returns every set of the most recent session for an exercise', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      // The older session is the longer one: a global `LIMIT 10` would top up
      // the newer session's rows with the leftovers from this one, which is the
      // mismatch this query exists to prevent.
      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
        { exerciseId: bench.id, setNumber: 2, weight: 82.5, reps: 6 },
        { exerciseId: bench.id, setNumber: 3, weight: 85, reps: 4 },
      ]);
      await db.saveWorkoutLog('2026-09-08', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 90, reps: 5 },
      ]);

      expect(await db.getPreviousExerciseSets(bench.id)).toEqual([
        { setNumber: 1, weight: 90, reps: 5 },
      ]);
    });

    it('reads the previous session of an exercise independently per exercise', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      const squat = await db.addExercise('Squat', 'Legs');

      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);
      await db.saveWorkoutLog('2026-09-08', 'Tuesday', '', [
        { exerciseId: squat.id, setNumber: 1, weight: 120, reps: 5 },
      ]);

      // Squat's most recent session is the newer one; bench has not been
      // trained since the earlier session, and must not inherit squat's rows.
      expect(await db.getPreviousExerciseSets(bench.id)).toEqual([
        { setNumber: 1, weight: 80, reps: 8 },
      ]);
      expect(await db.getPreviousExerciseSets(squat.id)).toEqual([
        { setNumber: 1, weight: 120, reps: 5 },
      ]);
    });

    it('lists only exercises that are logged or part of a routine', async () => {
      const { db } = await freshDatabase();
      const logged = await db.addExercise('Bench Press', 'Chest');
      const templated = await db.addExercise('Squat', 'Legs');
      await db.addExercise('Untouched Curl', 'Biceps');

      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: logged.id, setNumber: 1, weight: 80, reps: 8 },
      ]);
      await db.saveDayTemplate('Wednesday', [{ exerciseId: templated.id, targetSets: 3 }]);

      const tracked = await db.getTrackedExercises();
      expect(tracked.map((e) => e.name)).toEqual(['Bench Press', 'Squat']);
    });

    it('computes 30-day compliance stats and the current streak from logged days', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      await db.saveWeeklySplit({
        Monday: ['mg_chest'],
        Tuesday: ['mg_chest'],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: [],
      });

      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate()
      ).padStart(2, '0')}`;
      const DAY_NAMES = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ] as const;

      await db.saveWorkoutLog(todayIso, DAY_NAMES[today.getDay()], '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);

      const stats = await db.getComplianceStats(30);
      expect(stats.totalDays).toBe(30);
      expect(stats.completedDays).toBe(1);
      expect(stats.streak).toBe(1);
      expect(stats.scheduledDays).toBeGreaterThan(0);
    });
  });

  describe('exercise library', () => {
    it('rejects duplicate exercise names case-insensitively', async () => {
      const { db } = await freshDatabase();
      await db.addExercise('Bench Press', 'Chest');

      await expect(db.addExercise('  bench press ', 'Chest')).rejects.toThrow(
        db.ExerciseAlreadyExistsError
      );
      expect(await db.getAllExercises()).toHaveLength(1);
    });

    it('re-activates an archived exercise when re-created with the same name', async () => {
      const { db } = await freshDatabase();
      const original = await db.addExercise('Bench Press', 'Chest');
      await db.deleteExercise(original.id);
      expect(await db.getAllExercises()).toHaveLength(0);

      const reactivated = await db.addExercise('Bench Press', 'Chest');
      expect(reactivated.id).toBe(original.id);
      expect(reactivated.name).toBe('Bench Press');
      const all = await db.getAllExercises();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(original.id);
    });

    it('updates an exercise name and muscle group', async () => {
      const { db } = await freshDatabase();
      const exercise = await db.addExercise('Bench Press', 'Chest');

      await db.updateExercise(exercise.id, 'Incline Bench Press', 'Shoulders');

      const all = await db.getAllExercises();
      expect(all[0].name).toBe('Incline Bench Press');
      expect(all[0].muscleGroup).toBe('Shoulders');
    });

    it('throws when renaming an exercise onto an existing name', async () => {
      const { db } = await freshDatabase();
      const first = await db.addExercise('Bench Press', 'Chest');
      await db.addExercise('Squat', 'Legs');

      await expect(db.updateExercise(first.id, 'Squat', 'Legs')).rejects.toThrow(
        db.ExerciseAlreadyExistsError
      );
    });

    it('filters the library by muscle group', async () => {
      const { db } = await freshDatabase();
      await db.addExercise('Bench Press', 'Chest');
      await db.addExercise('Squat', 'Legs');

      const chest = await db.getExercisesByMuscleGroup('Chest');
      expect(chest.map((e) => e.name)).toEqual(['Bench Press']);
    });
  });
});
