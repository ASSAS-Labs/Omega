import * as SQLite from 'expo-sqlite';
import { DayOfWeek, Exercise, MuscleGroup, WeeklySplitDay, WorkoutLog, WorkoutSet, ExerciseHistory, DailyCompliance } from '../types';

const DB_NAME = 'gym_tracker.db';

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

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await initSchema(db);
      return db;
    })();
  }
  return dbPromise;
}

async function initSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS muscle_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      muscleGroup TEXT,
      createdAt TEXT
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

  // ------------------------------------------------------------------
  // Migration 1: legacy exercises schema (muscle_group_id FK) -> unified
  // global library model. Library starts empty by design (user-created only).
  // ------------------------------------------------------------------
  const legacyTable = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'exercises';"
  );
  if (legacyTable) {
    const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(exercises);');
    const hasLegacyCol = cols.some((c) => c.name === 'muscle_group_id');
    const hasNewCols = cols.some((c) => c.name === 'muscleGroup') && cols.some((c) => c.name === 'createdAt');
    if (hasLegacyCol && !hasNewCols) {
      await db.execAsync('PRAGMA foreign_keys = OFF;');
      await db.execAsync(`
        BEGIN;
        ALTER TABLE exercises RENAME TO exercises_legacy;
        CREATE TABLE exercises (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          muscleGroup TEXT,
          createdAt TEXT
        );
        DROP TABLE exercises_legacy;
        COMMIT;
      `);
      await db.execAsync('PRAGMA foreign_keys = ON;');
    }
  }

  // ------------------------------------------------------------------
  // Migration 2 (idempotent repair): ALTER TABLE RENAME rewrites the FK
  // clauses inside child tables (workout_sets, day_templates) so they point
  // at the renamed legacy table. If a database already went through the
  // broken migration (exercises has the new schema but the child FKs still
  // reference exercises_legacy or any other missing table), every INSERT
  // fails with a foreign key error. Detect the actual FK targets and rebuild
  // the child tables whenever they do not reference the live `exercises`
  // table. Runs as a transaction so a crash can never leave partial state.
  // ------------------------------------------------------------------
  const setsFk = await db.getAllAsync<{ table: string }>('PRAGMA foreign_key_list(workout_sets);');
  const tmplFk = await db.getAllAsync<{ table: string }>('PRAGMA foreign_key_list(day_templates);');
  const childrenNeedRebuild =
    !setsFk.some((f) => f.table === 'exercises') ||
    !tmplFk.some((f) => f.table === 'exercises');

  if (childrenNeedRebuild) {
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    await db.execAsync(`
      BEGIN;
      DROP TABLE IF EXISTS exercises_legacy;

      -- Rebuild workout_sets with FK pointing at the live exercises table
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

      -- Rebuild day_templates with FK pointing at the live exercises table
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
      COMMIT;
    `);
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }

  // Seed default muscle groups if empty (exercises stay empty — user-created only)
  const countRes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM muscle_groups;');
  if (countRes && countRes.count === 0) {
    for (const mg of DEFAULT_MUSCLE_GROUPS) {
      await db.runAsync('INSERT INTO muscle_groups (id, name) VALUES (?, ?);', [mg.id, mg.name]);
    }

    // Default Split setup example:
    // Monday/Thursday: Legs & Forearms
    // Tuesday/Friday: Chest & Triceps
    // Wednesday/Saturday: Back & Biceps
    const defaultSplit: { day: DayOfWeek; mgIds: string[] }[] = [
      { day: 'Monday', mgIds: ['mg_legs', 'mg_forearms'] },
      { day: 'Tuesday', mgIds: ['mg_chest', 'mg_triceps'] },
      { day: 'Wednesday', mgIds: ['mg_back', 'mg_biceps'] },
      { day: 'Thursday', mgIds: ['mg_legs', 'mg_forearms'] },
      { day: 'Friday', mgIds: ['mg_chest', 'mg_triceps'] },
      { day: 'Saturday', mgIds: ['mg_back', 'mg_biceps'] },
    ];

    for (const item of defaultSplit) {
      for (const mgId of item.mgIds) {
        await db.runAsync('INSERT INTO weekly_split (day_of_week, muscle_group_id) VALUES (?, ?);', [
          item.day,
          mgId,
        ]);
      }
    }
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
    'SELECT id, name, muscleGroup, createdAt FROM exercises WHERE muscleGroup = ? ORDER BY name ASC;',
    [muscleGroupName]
  );
}

export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDB();
  return await db.getAllAsync<Exercise>(
    'SELECT id, name, muscleGroup, createdAt FROM exercises ORDER BY name ASC;'
  );
}

// Adds a user-created exercise to the global library.
// Throws an Error with message 'EXERCISE_EXISTS' when the name is already taken.
export async function addExercise(name: string, muscleGroupName: string): Promise<Exercise> {
  const db = await getDB();
  const trimmed = name.trim();

  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM exercises WHERE name = ? COLLATE NOCASE;',
    [trimmed]
  );
  if (existing) {
    throw new Error('EXERCISE_EXISTS');
  }

  const id = `ex_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO exercises (id, name, muscleGroup, createdAt) VALUES (?, ?, ?, ?);',
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
    throw new Error('EXERCISE_EXISTS');
  }

  await db.runAsync('UPDATE exercises SET name = ?, muscleGroup = ? WHERE id = ?;', [
    trimmed,
    muscleGroupName || null,
    id,
  ]);
}

// Deletes an exercise; cascades remove it from day templates and logged sets
export async function deleteExercise(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM exercises WHERE id = ?;', [id]);
}

// Distinct exercises that have at least one logged session or appear in a configured routine
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
       JOIN exercises e ON dt.exercise_id = e.id;`
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

export async function getDayTemplate(
  day: DayOfWeek
): Promise<{ exercise: Exercise; targetSets: number }[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ exercise_id: string; target_sets: number }>(
    'SELECT exercise_id, target_sets FROM day_templates WHERE day_of_week = ? ORDER BY sort_order ASC;',
    [day]
  );

  const items: { exercise: Exercise; targetSets: number }[] = [];
  for (const r of rows) {
    const ex = await db.getFirstAsync<Exercise>(
      'SELECT id, name, muscleGroup, createdAt FROM exercises WHERE id = ?;',
      [r.exercise_id]
    );
    if (ex) {
      items.push({ exercise: ex, targetSets: r.target_sets });
    }
  }
  return items;
}

export async function saveDayTemplate(
  day: DayOfWeek,
  items: { exerciseId: string; targetSets: number }[]
): Promise<void> {
  const db = await getDB();

  // Gracefully skip exercises that no longer exist in the library so a stale
  // reference never fails the whole transaction
  const validRows = await db.getAllAsync<{ id: string }>('SELECT id FROM exercises;');
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

// Delete a day's logged workout (cascades to its sets)
export async function deleteWorkoutLogForDate(dateStr: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM workout_logs WHERE date = ?;', [dateStr]);
}

// Previous Session History Lookup
export async function getPreviousExerciseSets(exerciseId: string): Promise<{ weight: number; reps: number; setNumber: number }[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ weight: number; reps: number; set_number: number }>(
    `SELECT ws.weight, ws.reps, ws.set_number
     FROM workout_sets ws
     JOIN workout_logs wl ON ws.workout_log_id = wl.id
     WHERE ws.exercise_id = ? AND wl.completed = 1
     ORDER BY wl.date DESC, ws.set_number ASC
     LIMIT 10;`,
    [exerciseId]
  );

  return rows.map((r) => ({
    setNumber: r.set_number,
    weight: r.weight,
    reps: r.reps,
  }));
}

// Log Active Workout
export async function saveWorkoutLog(
  date: string,
  dayOfWeek: DayOfWeek,
  notes: string,
  sets: { exerciseId: string; setNumber: number; weight: number; reps: number }[]
): Promise<string> {
  const db = await getDB();
  const logId = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Gracefully skip sets whose exercise no longer exists in the library so a
  // stale reference never fails the whole transaction
  const validRows = await db.getAllAsync<{ id: string }>('SELECT id FROM exercises;');
  const validIds = new Set(validRows.map((r) => r.id));

  await db.withTransactionAsync(async () => {
    // Replace any existing log for this date (cascades to its sets), making
    // re-saving / editing a day's workout idempotent and free of duplicates
    await db.runAsync('DELETE FROM workout_logs WHERE date = ?;', [date]);

    await db.runAsync(
      'INSERT INTO workout_logs (id, date, day_of_week, notes, completed) VALUES (?, ?, ?, ?, 1);',
      [logId, date, dayOfWeek, notes || '']
    );

    for (const s of sets) {
      if (s.reps > 0 && validIds.has(s.exerciseId)) {
        const setNumId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await db.runAsync(
          'INSERT INTO workout_sets (id, workout_log_id, exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?, ?, ?);',
          [setNumId, logId, s.exerciseId, s.setNumber, s.weight, s.reps]
        );
      }
    }
  });

  return logId;
}

// Fetch Logged Workout for Date
export async function getWorkoutLogForDate(dateStr: string): Promise<WorkoutLog | null> {
  const db = await getDB();
  const log = await db.getFirstAsync<{ id: string; date: string; day_of_week: DayOfWeek; notes: string; completed: number }>(
    'SELECT id, date, day_of_week, notes, completed FROM workout_logs WHERE date = ? AND completed = 1;',
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

// All-time best set: highest estimated 1RM (Epley: weight * (1 + reps/30))
export async function getExerciseBestSet(
  exerciseId: string
): Promise<{ weight: number; reps: number; e1rm: number } | null> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ weight: number; reps: number }>(
    `SELECT ws.weight, ws.reps
     FROM workout_sets ws
     JOIN workout_logs wl ON ws.workout_log_id = wl.id
     WHERE ws.exercise_id = ? AND wl.completed = 1 AND ws.reps > 0 AND ws.weight > 0
     ORDER BY (ws.weight * (1 + ws.reps / 30.0)) DESC
     LIMIT 1;`,
    [exerciseId]
  );
  if (rows.length === 0) return null;
  const { weight, reps } = rows[0];
  return { weight, reps, e1rm: Math.round(weight * (1 + reps / 30)) };
}

// 4-week trend: total volume of the last 28 days vs the 28 days before that
export async function getExerciseVolumeTrend(
  exerciseId: string
): Promise<{ recentVolume: number; priorVolume: number }> {
  const db = await getDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 28);
  const priorCutoff = new Date();
  priorCutoff.setDate(priorCutoff.getDate() - 56);
  const today = new Date().toISOString().split('T')[0];
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const priorCutoffStr = priorCutoff.toISOString().split('T')[0];

  const rows = await db.getAllAsync<{ volume: number; bucket: string }>(
    `SELECT
       CASE
         WHEN wl.date >= ? THEN 'recent'
         WHEN wl.date >= ? THEN 'prior'
         ELSE 'old'
       END as bucket,
       SUM(ws.weight * ws.reps) as volume
     FROM workout_sets ws
     JOIN workout_logs wl ON ws.workout_log_id = wl.id
     WHERE ws.exercise_id = ? AND wl.completed = 1 AND wl.date <= ?
     GROUP BY bucket;`,
    [cutoffStr, priorCutoffStr, exerciseId, today]
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
  let currentStreak = 0;
  let streakBroken = false;

  const logs = await db.getAllAsync<{ date: string }>(
    'SELECT DISTINCT date FROM workout_logs WHERE completed = 1 ORDER BY date DESC;'
  );
  const completedDates = new Set(logs.map((l) => l.date));

  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as DayOfWeek[];

  for (let i = 0; i < daysLimit; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeekStr = daysMap[d.getDay()];
    
    const isScheduled = (split[dayOfWeekStr] || []).length > 0;
    const isCompleted = completedDates.has(dateStr);

    if (isScheduled) scheduledCount++;
    if (isCompleted) completedCount++;

    // Calculate current streak
    if (!streakBroken) {
      if (isCompleted) {
        currentStreak++;
      } else if (isScheduled && dateStr !== today.toISOString().split('T')[0]) {
        streakBroken = true;
      }
    }
  }

  return {
    totalDays: daysLimit,
    scheduledDays: scheduledCount,
    completedDays: completedCount,
    streak: currentStreak,
  };
}
