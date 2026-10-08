/**
 * Development fixture tests.
 *
 * The suite runs with `DEBUG_SEED_MODE === 'off'`, so `getDB()` never touches the
 * fixture here: each test drives `seedDebugFixture` / `purgeDebugFixture`
 * explicitly against the same in-memory SQLite engine (real foreign keys, real
 * cascades) the data-layer suite uses.
 */
import { format, parseISO } from 'date-fns';
import type * as DatabaseModule from '../database';
import type * as DebugSeedModule from '../debugSeed';
import type { MockSQLiteDatabase } from '../../../__mocks__/expo-sqlite';

type SqliteMock = {
  openDatabaseSync: (name: string) => MockSQLiteDatabase;
  __resetDatabases: () => void;
};

/** What the fixture expects of a connection; the mock satisfies it structurally. */
type FixtureDb = Parameters<typeof DebugSeedModule.seedDebugFixture>[0];

const sqlite = () => jest.requireMock('expo-sqlite') as unknown as SqliteMock;
const loadDbModule = () => require('../database') as typeof DatabaseModule;
const loadSeedModule = () => require('../debugSeed') as typeof DebugSeedModule;

const MUSCLE_GROUP_COUNT = 9; // Default seeded groups

/** Thursday: a training day in the fixture, so the history has to stop before it to leave today free. */
const REFERENCE_DAY = new Date(2026, 2, 12, 12, 0, 0);
const LIBRARY_SIZE = 22;
const ROUTINE_ENTRIES = 23; // 5 + 5 + 5 + 4 + 4 movements across the five training days
/** Session × movement pairs: what the deterministic fixture must produce for this reference day. */
const MOVEMENT_SESSIONS = 1043;
const SEEDED_SESSIONS = 227; // 52 weeks of a five-day split, less the ~12% missed sessions
const SEEDED_SETS = 3230;
/** Deload sessions are labelled in the notes; deloads land in six of the 52 weeks. */
const DELOAD_SESSIONS = 27;

async function freshDatabase(): Promise<{
  db: typeof DatabaseModule;
  seed: typeof DebugSeedModule;
  handle: MockSQLiteDatabase;
  fixtureDb: FixtureDb;
  seedFixture: (options?: { today?: Date }) => Promise<DebugSeedModule.DebugSeedResult | null>;
}> {
  const db = loadDbModule();
  const seed = loadSeedModule();
  const handle = (await db.getDB()) as unknown as MockSQLiteDatabase;
  const fixtureDb = handle as unknown as FixtureDb;
  return {
    db,
    seed,
    handle,
    fixtureDb,
    seedFixture: (options) => seed.seedDebugFixture(fixtureDb, options),
  };
}

async function countRows(
  handle: MockSQLiteDatabase,
  table: string,
  where = '1 = 1'
): Promise<number> {
  const row = await handle.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM ${table} WHERE ${where};`
  );
  return row?.count ?? 0;
}

async function exerciseIdByName(handle: MockSQLiteDatabase, name: string): Promise<string> {
  const row = await handle.getFirstAsync<{ id: string }>(
    'SELECT id FROM exercises WHERE name = ?;',
    [name]
  );
  if (!row) throw new Error(`fixture exercise not found: ${name}`);
  return row.id;
}

/** Loads the data layer with the bundle constants a given build would bake in. */
async function withBundle<T>(
  bundle: { nodeEnv: string; dev: boolean },
  run: () => Promise<T>
): Promise<T> {
  const env = process.env as Record<string, string | undefined>;
  const runtime = globalThis as { __DEV__?: boolean };
  const previousEnv = env.NODE_ENV;
  const previousDev = runtime.__DEV__;
  env.NODE_ENV = bundle.nodeEnv;
  runtime.__DEV__ = bundle.dev;
  try {
    return await run();
  } finally {
    env.NODE_ENV = previousEnv;
    runtime.__DEV__ = previousDev;
  }
}

describe('debug fixture', () => {
  beforeEach(() => {
    sqlite().__resetDatabases();
    jest.resetModules();
  });

  describe('bundle gate', () => {
    it('seeds development bundles, purges release bundles, and stays inert under test', () => {
      const { debugSeedModeFor } = loadSeedModule();

      expect(debugSeedModeFor(true, 'development')).toBe('seed');
      expect(debugSeedModeFor(false, 'production')).toBe('purge');
      expect(debugSeedModeFor(false, 'development')).toBe('purge'); // expo start --no-dev
      expect(debugSeedModeFor(true, 'production')).toBe('purge'); // production bundle, dev flag
      expect(debugSeedModeFor(false, undefined)).toBe('purge'); // no NODE_ENV at all
      expect(debugSeedModeFor(true, 'test')).toBe('off');
      expect(debugSeedModeFor(false, 'test')).toBe('off');
    });

    it('leaves this Jest run alone, so every other suite owns its own database', () => {
      expect(loadSeedModule().DEBUG_SEED_MODE).toBe('off');
    });
  });

  describe('connection wiring', () => {
    it('seeds once when a development bundle opens a fresh database', async () => {      const log = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const sessions = await withBundle({ nodeEnv: 'development', dev: true }, async () => {
          const db = loadDbModule();
          const handle = (await db.getDB()) as unknown as MockSQLiteDatabase;
          return countRows(handle, 'workout_logs');
        });

        expect(sessions).toBeGreaterThan(200);
        expect(log).toHaveBeenCalledWith(expect.stringContaining('[debugSeed] seeded'));
      } finally {
        log.mockRestore();
      }
    });

    it('purges the fixture when a release build opens the database a development build seeded', async () => {
      // A development install filled this database…
      const { seedFixture } = await freshDatabase();
      const seeded = await seedFixture();
      expect(seeded!.sessions).toBeGreaterThan(200);

      // …and the same file is now opened by a release build (in-place upgrade),
      // the one path where development rows could outlive the build that wrote them.
      jest.resetModules();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        await withBundle({ nodeEnv: 'production', dev: false }, async () => {
          const db = loadDbModule();
          const handle = (await db.getDB()) as unknown as MockSQLiteDatabase;

          expect(await countRows(handle, 'workout_logs', "id GLOB 'dbg_*'")).toBe(0);
          expect(await countRows(handle, 'workout_sets', "id GLOB 'dbg_*'")).toBe(0);
          expect(await countRows(handle, 'exercises')).toBe(0);
          expect(await countRows(handle, 'day_templates')).toBe(0);

          // The seeded split carries no id of its own, so it stays: deleting it by
          // value could delete a split the user configured themselves.
          expect(await countRows(handle, 'weekly_split')).toBeGreaterThan(0);
        });

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('left behind'));
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe('seedDebugFixture', () => {
    it('writes a year of sessions day by day, oldest first, ending yesterday', async () => {
      const { handle, seedFixture } = await freshDatabase();

      const result = await seedFixture({ today: REFERENCE_DAY });
      expect(result).not.toBeNull();
      expect(result).toEqual({
        sessions: SEEDED_SESSIONS,
        sets: SEEDED_SETS,
        exercises: LIBRARY_SIZE,
      });

      const logs = await handle.getAllAsync<{ date: string; day_of_week: string; completed: number }>(
        'SELECT date, day_of_week, completed FROM workout_logs ORDER BY date ASC;'
      );

      // A span of exactly 52 weeks aligned to real Monday-Sunday training weeks,
      // stopping before the reference day so today stays free for the logging flow
      // even though it is a training day itself.
      expect(logs[0].date).toBe('2025-03-17');
      expect(parseISO(logs[0].date).getDay()).toBe(1); // Monday
      expect(logs[logs.length - 1].date).toBe('2026-03-10');
      expect(await countRows(handle, 'workout_logs', "date >= '2026-03-12'")).toBe(0);
      expect(logs).toHaveLength(SEEDED_SESSIONS);
      expect(new Set(logs.map((log) => log.date)).size).toBe(logs.length);
      expect(logs.every((log) => log.completed === 1)).toBe(true);

      // Every logged day knows which weekday it was, checked against date-fns
      // rather than against the fixture's own calendar handling.
      expect(
        logs.every((log) => log.day_of_week === format(parseISO(log.date), 'EEEE'))
      ).toBe(true);

      // Only the five routine days are ever trained.
      expect(Array.from(new Set(logs.map((log) => log.day_of_week))).sort()).toEqual([
        'Friday',
        'Monday',
        'Saturday',
        'Thursday',
        'Tuesday',
      ]);
    });

    it('logs three to four sets per movement inside its rep range', async () => {
      const { handle, seedFixture } = await freshDatabase();
      const result = await seedFixture({ today: REFERENCE_DAY });

      const sessions = await handle.getAllAsync<{ workout_log_id: string; sets: number }>(
        `SELECT workout_log_id, COUNT(*) AS sets FROM workout_sets GROUP BY workout_log_id;`
      );
      expect(sessions).toHaveLength(result!.sessions);
      expect(sessions.every((row) => row.sets >= 8 && row.sets <= 16)).toBe(true);
      expect(await countRows(handle, 'workout_sets')).toBe(result!.sets);

      // Set numbers restart at 1 for every movement in every session.
      const firstSets = await countRows(handle, 'workout_sets', 'set_number = 1');
      expect(firstSets).toBe(MOVEMENT_SESSIONS);
      const loggedMovements = await handle.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM (SELECT DISTINCT workout_log_id, exercise_id FROM workout_sets);'
      );
      expect(firstSets).toBe(loggedMovements?.count);
    });

    it('progresses working weights across the year and deloads every eighth week', async () => {
      const { handle, seedFixture } = await freshDatabase();
      await seedFixture({ today: REFERENCE_DAY });

      const bench = await handle.getAllAsync<{ date: string; weight: number }>(
        `SELECT wl.date AS date, ws.weight AS weight
           FROM workout_sets ws
           JOIN workout_logs wl ON ws.workout_log_id = wl.id
           JOIN exercises e ON ws.exercise_id = e.id
          WHERE e.name = 'Barbell Flat Bench Press'
          ORDER BY wl.date ASC;`
      );
      const average = (rows: { weight: number }[]) =>
        rows.reduce((sum, row) => sum + row.weight, 0) / rows.length;

      const firstMonth = bench.filter((row) => row.date < '2025-04-15');
      const lastMonth = bench.filter((row) => row.date >= '2026-02-15');
      expect(firstMonth.length).toBeGreaterThan(0);
      expect(lastMonth.length).toBeGreaterThan(0);
      expect(average(firstMonth)).toBeLessThan(average(lastMonth));

      // Every weight lands on a plate the gym can actually load.
      expect(bench.every((row) => row.weight % 2.5 === 0)).toBe(true);

      // Deloads are labelled, which is what explains the dips in the charts.
      expect(await countRows(handle, 'workout_logs', "notes = 'Deload week — kept it light'")).toBe(
        DELOAD_SESSIONS
      );
    });

    it('logs bodyweight movements as zero-weight sets', async () => {
      const { handle, seedFixture } = await freshDatabase();
      await seedFixture({ today: REFERENCE_DAY });

      const rows = await handle.getAllAsync<{ weight: number; reps: number }>(
        `SELECT ws.weight AS weight, ws.reps AS reps
           FROM workout_sets ws
           JOIN exercises e ON ws.exercise_id = e.id
          WHERE e.name = 'Hanging Leg Raise';`
      );

      expect(rows.length).toBeGreaterThan(30);
      expect(rows.every((row) => row.weight === 0)).toBe(true);
      // Inside the movement's 10-15 range, less the odd short set.
      expect(rows.every((row) => row.reps >= 8 && row.reps <= 15)).toBe(true);
    });

    it('configures the weekly split and the day routines the history follows', async () => {
      const { db, handle, seedFixture } = await freshDatabase();
      await seedFixture({ today: REFERENCE_DAY });

      const split = await db.getWeeklySplit();
      expect(split.Monday).toEqual(['mg_chest', 'mg_triceps']);
      expect(split.Tuesday).toEqual(['mg_back', 'mg_biceps']);
      expect(split.Thursday).toEqual(['mg_shoulders', 'mg_abs']);
      expect(split.Friday).toEqual(['mg_legs', 'mg_calves']);
      expect(split.Saturday).toEqual(['mg_chest', 'mg_back', 'mg_shoulders']);
      expect(split.Wednesday).toEqual([]);
      expect(split.Sunday).toEqual([]);

      expect(await db.getDayTemplateCounts()).toEqual({
        Monday: 5,
        Tuesday: 5,
        Wednesday: 0,
        Thursday: 5,
        Friday: 4,
        Saturday: 4,
        Sunday: 0,
      });
      expect(await countRows(handle, 'day_templates')).toBe(ROUTINE_ENTRIES);

      // The routine and the logged history agree on the schedule, so a session
      // never contradicts the day it was trained on.
      const monday = await db.getDayTemplate('Monday');
      expect(monday.map((item) => item.exercise.name)).toEqual([
        'Barbell Flat Bench Press',
        'Incline Dumbbell Press',
        'Cable Crossover',
        'Tricep Rope Cable Pushdown',
        'Overhead Cable Tricep Extension',
      ]);
      expect(await countRows(handle, 'exercises')).toBe(LIBRARY_SIZE);
    });

    it('adds nothing when it runs again', async () => {
      const { handle, seedFixture } = await freshDatabase();

      const first = await seedFixture({ today: REFERENCE_DAY });
      const second = await seedFixture({ today: REFERENCE_DAY });

      expect(second).toBeNull();
      expect(await countRows(handle, 'workout_logs')).toBe(first!.sessions);
      expect(await countRows(handle, 'workout_sets')).toBe(first!.sets);
      expect(await countRows(handle, 'exercises')).toBe(first!.exercises);
      expect(await countRows(handle, 'day_templates')).toBe(ROUTINE_ENTRIES);
    });

    it('leaves a database that is already in use alone', async () => {
      const { db, handle, seedFixture } = await freshDatabase();
      await db.addExercise('My Own Lift', 'Back');

      expect(await seedFixture({ today: REFERENCE_DAY })).toBeNull();
      expect(await countRows(handle, 'exercises')).toBe(1);
      expect(await countRows(handle, 'workout_logs')).toBe(0);
      expect(await countRows(handle, 'day_templates')).toBe(0);
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

    it('feeds the analytics queries it exists for', async () => {
      const { db, handle, seedFixture } = await freshDatabase();
      // The real reference day here: the trend and compliance queries bucket
      // against the actual clock, not against the seeded dates.
      const result = await seedFixture();

      const dates = await db.getCompletedWorkoutDates();
      expect(dates).toHaveLength(result!.sessions);
      expect(dates[dates.length - 1] < format(new Date(), 'yyyy-MM-dd')).toBe(true);

      const benchId = await exerciseIdByName(handle, 'Barbell Flat Bench Press');
      const progress = await db.getExerciseProgress(benchId);
      expect(progress.length).toBeGreaterThan(35);
      expect(progress[0].maxWeight).toBeLessThan(progress[progress.length - 1].maxWeight);

      const best = await db.getExerciseBestSet(benchId);
      expect(best!.e1rm).toBeGreaterThan(best!.weight);

      const trend = await db.getExerciseVolumeTrend(benchId);
      expect(trend.recentVolume).toBeGreaterThan(0);
      expect(trend.priorVolume).toBeGreaterThan(0);

      const previous = await db.getPreviousExerciseSets(benchId);
      expect(previous).toHaveLength(10); // The UI's "last time" lookup is saturated

      const compliance = await db.getComplianceStats(30);
      expect(compliance.totalDays).toBe(30);
      expect(compliance.scheduledDays).toBeGreaterThan(19);
      expect(compliance.completedDays).toBeGreaterThan(0);

      expect(await db.getTrackedExercises()).toHaveLength(LIBRARY_SIZE);
    });
  });

  describe('purgeDebugFixture', () => {
    it('removes every fixture row and keeps the user data around it', async () => {
      const { db, seed, handle, fixtureDb, seedFixture } = await freshDatabase();
      await seedFixture({ today: REFERENCE_DAY });

      // Real rows written through the app's own API, after the fixture ran.
      const own = await db.addExercise('My Own Lift', 'Back');
      await db.saveWorkoutLog('2025-01-05', 'Sunday', 'my own session', [
        { exerciseId: own.id, setNumber: 1, weight: 42.5, reps: 8 },
      ]);

      const removed = await seed.purgeDebugFixture(fixtureDb);
      expect(removed).toBeGreaterThan(0);

      // Fixture rows, and the sets and templates that cascaded from them, are gone.
      expect(await countRows(handle, 'workout_logs', "id GLOB 'dbg_*'")).toBe(0);
      expect(await countRows(handle, 'workout_sets', "id GLOB 'dbg_*'")).toBe(0);
      expect(await countRows(handle, 'exercises', "id GLOB 'dbg_*'")).toBe(0);
      expect(await countRows(handle, 'day_templates')).toBe(0);

      // The user's own rows and the seeded muscle groups survive untouched.
      expect(await countRows(handle, 'exercises')).toBe(1);
      expect(await countRows(handle, 'workout_logs')).toBe(1);
      expect(await countRows(handle, 'workout_sets')).toBe(1);
      expect(await db.getExerciseProgress(own.id)).toHaveLength(1);
      expect((await db.getTrackedExercises()).map((exercise) => exercise.name)).toEqual([
        'My Own Lift',
      ]);
      expect(await db.getMuscleGroups()).toHaveLength(MUSCLE_GROUP_COUNT);
    });

    it('is a no-op on a database that never saw the fixture', async () => {
      const { db, seed, handle, fixtureDb } = await freshDatabase();
      await db.addExercise('My Own Lift', 'Back');

      expect(await seed.purgeDebugFixture(fixtureDb)).toBe(0);
      expect(await countRows(handle, 'exercises')).toBe(1);
      expect(await db.getMuscleGroups()).toHaveLength(MUSCLE_GROUP_COUNT);
    });
  });
});
