import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDB } from './database';
import { useAppStore } from '../store/useAppStore';

const BACKUP_FILE = 'omega_backup.json';
const BACKUP_VERSION = 1;

interface ExerciseRow {
  id: string;
  name: string;
  muscleGroup?: string | null;
  createdAt?: string | null;
}
interface DayTemplateRow {
  day_of_week: string;
  exercise_id: string;
  target_sets: number;
  sort_order: number;
}
interface WorkoutLogRow {
  id: string;
  date: string;
  day_of_week: string;
  notes?: string | null;
  completed: number;
}
interface WorkoutSetRow {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
}

interface BackupData {
  exercises: ExerciseRow[];
  day_templates: DayTemplateRow[];
  workout_logs: WorkoutLogRow[];
  workout_sets: WorkoutSetRow[];
}

interface BackupPayload {
  app: 'OMEGA';
  version: number;
  exportedAt: string;
  data: BackupData;
}

/**
 * Exports all local data as formatted JSON to the app cache and opens the
 * native share sheet so the user can save/send the backup file.
 */
export async function exportBackup(): Promise<void> {
  const db = await getDB();
  const payload: BackupPayload = {
    app: 'OMEGA',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      exercises: await db.getAllAsync<ExerciseRow>('SELECT * FROM exercises;'),
      day_templates: await db.getAllAsync<DayTemplateRow>('SELECT * FROM day_templates;'),
      workout_logs: await db.getAllAsync<WorkoutLogRow>('SELECT * FROM workout_logs;'),
      workout_sets: await db.getAllAsync<WorkoutSetRow>('SELECT * FROM workout_sets;'),
    },
  };

  const file = new File(Paths.cache, BACKUP_FILE);
  file.write(JSON.stringify(payload, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export OMEGA backup',
    UTI: 'public.json',
  });
}

/** Validates a parsed backup payload; throws on malformed input. */
function validateBackup(payload: unknown): BackupPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid backup file: not a JSON object.');
  }
  const p = payload as Partial<BackupPayload>;
  if (p.app !== 'OMEGA' || !p.data) {
    throw new Error('Invalid backup file: not an OMEGA backup.');
  }
  const d = p.data as Partial<BackupData>;
  for (const key of ['exercises', 'day_templates', 'workout_logs', 'workout_sets'] as const) {
    if (!Array.isArray(d[key])) {
      throw new Error(`Invalid backup file: missing "${key}" array.`);
    }
  }
  return payload as BackupPayload;
}

/**
 * Imports a backup file: validates it, then restores every table inside a
 * single transaction (FK-safe insert order), followed by a state reload.
 */
export async function importBackup(uri: string): Promise<number> {
  const file = new File(uri);
  const raw = await file.text();
  const payload = validateBackup(JSON.parse(raw));

  const db = await getDB();
  await db.withTransactionAsync(async () => {
    // Wipe in FK-safe order (children first)
    await db.runAsync('DELETE FROM workout_sets;');
    await db.runAsync('DELETE FROM day_templates;');
    await db.runAsync('DELETE FROM workout_logs;');
    await db.runAsync('DELETE FROM exercises;');

    // Restore in FK-safe order (parents first)
    for (const row of payload.data.exercises) {
      await db.runAsync(
        'INSERT OR REPLACE INTO exercises (id, name, muscleGroup, createdAt) VALUES (?, ?, ?, ?);',
        [row.id, row.name, row.muscleGroup ?? null, row.createdAt ?? null]
      );
    }
    for (const row of payload.data.day_templates) {
      await db.runAsync(
        'INSERT OR REPLACE INTO day_templates (day_of_week, exercise_id, target_sets, sort_order) VALUES (?, ?, ?, ?);',
        [row.day_of_week, row.exercise_id, row.target_sets ?? 3, row.sort_order ?? 0]
      );
    }
    for (const row of payload.data.workout_logs) {
      await db.runAsync(
        'INSERT OR REPLACE INTO workout_logs (id, date, day_of_week, notes, completed) VALUES (?, ?, ?, ?, ?);',
        [row.id, row.date, row.day_of_week, row.notes ?? '', row.completed ?? 1]
      );
    }
    for (const row of payload.data.workout_sets) {
      await db.runAsync(
        'INSERT OR REPLACE INTO workout_sets (id, workout_log_id, exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?, ?, ?);',
        [row.id, row.workout_log_id, row.exercise_id, row.set_number, row.weight, row.reps]
      );
    }
  });

  // Trigger a full state reload so every screen reflects the restored data
  const store = useAppStore.getState();
  await store.refreshData();
  store.notifyWorkoutSaved();

  return payload.data.workout_sets.length;
}

/** Opens the document picker and restores the chosen JSON backup. */
export async function pickAndImportBackup(): Promise<number> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) {
    throw new Error('Import cancelled.');
  }
  return importBackup(result.assets[0].uri);
}
