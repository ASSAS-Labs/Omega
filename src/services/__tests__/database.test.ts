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

  describe('schema initialization and versioning', () => {
    it('creates the base schema, enables foreign keys, and stamps user_version = 1', async () => {
      const { db, handle } = await freshDatabase();

      const version = await handle.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
      const foreignKeys = await handle.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys;');
      const tables = await handle.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"
      );

      expect(db.SCHEMA_VERSION).toBe(1);
      expect(version?.user_version).toBe(1);
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
      expect((await second.handle.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version).toBe(1);
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

    it('keeps cascading deletes working after a relaunch', async () => {
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

      // ON DELETE CASCADE must clean up both children of the deleted exercise
      expect(await second.handle.getAllAsync('SELECT id FROM workout_sets;')).toEqual([]);
      expect(await second.handle.getAllAsync('SELECT exercise_id FROM day_templates;')).toEqual([]);
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

    it('cascades exercise deletion to routine templates and logged sets', async () => {
      const { db } = await freshDatabase();
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

      const template = await db.getDayTemplate('Monday');
      expect(template.map((t) => t.exercise.id)).toEqual([other.id]);

      const log = await db.getWorkoutLogForDate('2026-09-01');
      expect(log?.sets.map((s) => s.exerciseId)).toEqual([other.id]);
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

    it('drops sets with zero reps and unknown exercises', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
        { exerciseId: bench.id, setNumber: 2, weight: 80, reps: 0 },
        { exerciseId: 'ex_ghost', setNumber: 3, weight: 50, reps: 5 },
      ]);

      const log = await db.getWorkoutLogForDate('2026-09-01');
      expect(log?.sets).toHaveLength(1);
      expect(log?.sets[0].setNumber).toBe(1);
    });

    it('is idempotent for a date: re-saving replaces the previous log and its sets', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      await db.saveWorkoutLog('2026-09-01', 'Tuesday', 'first', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);
      const secondId = await db.saveWorkoutLog('2026-09-01', 'Tuesday', 'second', [
        { exerciseId: bench.id, setNumber: 1, weight: 90, reps: 5 },
        { exerciseId: bench.id, setNumber: 2, weight: 90, reps: 4 },
      ]);

      const logs = await (await db.getDB()).getAllAsync<{ id: string }>('SELECT id FROM workout_logs;');
      expect(logs).toHaveLength(1);

      const log = await db.getWorkoutLogForDate('2026-09-01');
      expect(log?.id).toBe(secondId);
      expect(log?.notes).toBe('second');
      expect(log?.sets).toHaveLength(2);
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

    it('lists distinct completed workout days for streak analytics', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      await db.saveWorkoutLog('2026-09-03', 'Thursday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);
      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);
      await db.saveWorkoutLog('2026-09-01', 'Tuesday', 'same day re-log', [
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

    it('returns null when an exercise has no logged sets yet', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');
      expect(await db.getExerciseBestSet(bench.id)).toBeNull();
      expect(await db.getExerciseProgress(bench.id)).toEqual([]);
      expect(await db.getPreviousExerciseSets(bench.id)).toEqual([]);
      expect(await db.getExerciseVolumeTrend(bench.id)).toEqual({ recentVolume: 0, priorVolume: 0 });
    });

    it('splits training volume into the trailing 4 weeks versus the 4 weeks before', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      await db.saveWorkoutLog(daysAgo(10), 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 100, reps: 5 }, // 500 kg, recent window
      ]);
      await db.saveWorkoutLog(daysAgo(40), 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 50, reps: 10 }, // 500 kg, prior window
      ]);
      await db.saveWorkoutLog(daysAgo(70), 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 999, reps: 10 }, // older than both windows
      ]);

      expect(await db.getExerciseVolumeTrend(bench.id)).toEqual({
        recentVolume: 500,
        priorVolume: 500,
      });
    });

    it('returns the most recent previous sets for an exercise', async () => {
      const { db } = await freshDatabase();
      const bench = await db.addExercise('Bench Press', 'Chest');

      await db.saveWorkoutLog('2026-09-01', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
      ]);
      await db.saveWorkoutLog('2026-09-08', 'Tuesday', '', [
        { exerciseId: bench.id, setNumber: 1, weight: 85, reps: 7 },
      ]);

      const previous = await db.getPreviousExerciseSets(bench.id);
      expect(previous[0]).toEqual({ setNumber: 1, weight: 85, reps: 7 });
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

      await expect(db.addExercise('  bench press ', 'Chest')).rejects.toThrow('EXERCISE_EXISTS');
      expect(await db.getAllExercises()).toHaveLength(1);
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

      await expect(db.updateExercise(first.id, 'Squat', 'Legs')).rejects.toThrow('EXERCISE_EXISTS');
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
