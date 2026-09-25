/**
 * Tests for the JSON backup service. `expo-file-system`, `expo-sharing` and
 * `expo-document-picker` are replaced by the in-memory manual mocks in
 * `__mocks__/`, while the database layer runs on the real SQLite engine from
 * `__mocks__/expo-sqlite.ts` — so an export/import round-trip exercises the
 * actual schema and foreign keys.
 *
 * NOTE: mocks are loaded with `require` (not `jest.requireMock`) so the handles
 * are the exact instances the service under test talks to.
 */
import type { File as MockFile, Paths as MockPaths } from '../../../__mocks__/expo-file-system';
import type * as DatabaseModule from '../database';
import type * as BackupModule from '../backupService';

type FsMock = {
  File: typeof MockFile;
  Paths: typeof MockPaths;
  __resetFileSystem: () => void;
};

type SharingMock = {
  __resetSharing: () => void;
  __setSharingAvailable: (available: boolean) => void;
  __getSharedUris: () => string[];
};

type PickerMock = {
  __setNextPickerResult: (uri: string | null) => void;
  __resetDocumentPicker: () => void;
};

const fs = () => require('expo-file-system') as unknown as FsMock;
const sharing = () => require('expo-sharing') as unknown as SharingMock;
const picker = () => require('expo-document-picker') as unknown as PickerMock;

const loadDbModule = () => require('../database') as typeof DatabaseModule;
const loadBackupModule = () => require('../backupService') as typeof BackupModule;

const EXPORTED_FILE_URI = 'file:///cache/omega_backup.json';

interface BackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  data: {
    exercises: Record<string, unknown>[];
    day_templates: Record<string, unknown>[];
    workout_logs: Record<string, unknown>[];
    workout_sets: Record<string, unknown>[];
  };
}

/** Reads the payload the service just wrote to the (virtual) cache file. */
function readRawExportedText(): string {
  const mockFs = fs();
  return new mockFs.File(EXPORTED_FILE_URI).text();
}

function readExportedPayload(): BackupPayload {
  return JSON.parse(readRawExportedText()) as BackupPayload;
}

function writeFile(uri: string, content: string): void {
  const mockFs = fs();
  new mockFs.File(uri).write(content);
}

/** Seeds a small but complete dataset (exercise + routine + logged session). */
async function seedDatabase(dbModule: typeof DatabaseModule) {
  const bench = await dbModule.addExercise('Bench Press', 'Chest');
  const fly = await dbModule.addExercise('Cable Fly', 'Chest');
  await dbModule.saveDayTemplate('Monday', [
    { exerciseId: bench.id, targetSets: 4 },
    { exerciseId: fly.id, targetSets: 2 },
  ]);
  await dbModule.saveWorkoutLog('2026-09-01', 'Tuesday', 'push day', [
    { exerciseId: bench.id, setNumber: 1, weight: 80, reps: 8 },
    { exerciseId: fly.id, setNumber: 2, weight: 25, reps: 12 },
  ]);
  return { bench, fly };
}

describe('backupService', () => {
  beforeEach(() => {
    (require('expo-sqlite') as unknown as { __resetDatabases: () => void }).__resetDatabases();
    fs().__resetFileSystem();
    sharing().__resetSharing();
    picker().__resetDocumentPicker();
    jest.resetModules();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('export', () => {
    it('serializes every table into a versioned, human-readable OMEGA payload', async () => {
      const db = loadDbModule();
      const backup = loadBackupModule();
      await seedDatabase(db);

      await backup.exportBackup();

      const payload = readExportedPayload();
      expect(payload.app).toBe('OMEGA');
      expect(payload.version).toBe(1);
      expect(Date.parse(payload.exportedAt)).not.toBeNaN();

      expect(payload.data.exercises.map((e) => e.name).sort()).toEqual([
        'Bench Press',
        'Cable Fly',
      ]);
      expect(payload.data.day_templates).toHaveLength(2);
      expect(payload.data.workout_logs).toHaveLength(1);
      expect(payload.data.workout_sets).toHaveLength(2);

      // The exported file is written with indentation, i.e. readable diffs
      expect(readRawExportedText()).toContain('\n  "');
    });

    it('opens the native share sheet for the exported file', async () => {
      const backup = loadBackupModule();

      await backup.exportBackup();

      expect(sharing().__getSharedUris()).toEqual([EXPORTED_FILE_URI]);
    });

    it('fails loudly when the device cannot share files', async () => {
      const backup = loadBackupModule();
      sharing().__setSharingAvailable(false);

      await expect(backup.exportBackup()).rejects.toThrow('Sharing is not available on this device.');
    });
  });

  describe('round-trip parity', () => {
    it('restores exported data byte-for-byte on a fresh import', async () => {
      const db = loadDbModule();
      const backup = loadBackupModule();
      await seedDatabase(db);

      await backup.exportBackup();
      const exported = readExportedPayload();

      // Wipe the database through a valid, empty backup before restoring
      writeFile(
        'file:///cache/empty.json',
        JSON.stringify({
          app: 'OMEGA',
          version: 1,
          exportedAt: new Date().toISOString(),
          data: { exercises: [], day_templates: [], workout_logs: [], workout_sets: [] },
        })
      );
      await backup.importBackup('file:///cache/empty.json');
      expect(await db.getAllExercises()).toEqual([]);

      const restoredSets = await backup.importBackup(EXPORTED_FILE_URI);
      expect(restoredSets).toBe(2);

      // Re-export and compare everything except the volatile timestamp
      await backup.exportBackup();
      const reExported = readExportedPayload();
      expect(reExported.data).toEqual(exported.data);
      expect(reExported.app).toBe(exported.app);
      expect(reExported.version).toBe(exported.version);

      // Data is genuinely usable through the public API after the restore
      const log = await db.getWorkoutLogForDate('2026-09-01');
      expect(log?.sets).toHaveLength(2);
      expect((await db.getDayTemplate('Monday')).map((t) => t.targetSets)).toEqual([4, 2]);
    });

    it('refreshes app state after a successful import', async () => {
      const db = loadDbModule();
      const backup = loadBackupModule();
      await seedDatabase(db);
      await backup.exportBackup();

      const store = require('../../store/useAppStore') as typeof import('../../store/useAppStore');
      const before = store.useAppStore.getState().workoutSavedVersion;

      await backup.importBackup(EXPORTED_FILE_URI);

      const state = store.useAppStore.getState();
      expect(state.workoutSavedVersion).toBe(before + 1);
      expect(state.allExercises.map((e) => e.name)).toEqual(['Bench Press', 'Cable Fly']);
    });
  });

  describe('import validation', () => {
    it('rejects text that is not valid JSON', async () => {
      writeFile('file:///cache/broken.json', '{"app": "OMEGA", ');

      await expect(loadBackupModule().importBackup('file:///cache/broken.json')).rejects.toThrow(
        SyntaxError
      );
    });

    it('rejects payloads from another app', async () => {
      writeFile('file:///cache/other.json', JSON.stringify({ app: 'OTHER', data: {} }));

      await expect(loadBackupModule().importBackup('file:///cache/other.json')).rejects.toThrow(
        'Invalid backup file: not an OMEGA backup.'
      );
    });

    it('rejects non-object payloads', async () => {
      writeFile('file:///cache/scalar.json', JSON.stringify(42));

      await expect(loadBackupModule().importBackup('file:///cache/scalar.json')).rejects.toThrow(
        'Invalid backup file: not a JSON object.'
      );
    });

    it.each(['exercises', 'day_templates', 'workout_logs', 'workout_sets'])(
      'rejects partial payloads missing the "%s" array',
      async (missingKey) => {
        const data: Record<string, unknown> = {
          exercises: [],
          day_templates: [],
          workout_logs: [],
          workout_sets: [],
        };
        delete data[missingKey];
        writeFile(
          'file:///cache/partial.json',
          JSON.stringify({ app: 'OMEGA', version: 1, exportedAt: new Date().toISOString(), data })
        );

        await expect(
          loadBackupModule().importBackup('file:///cache/partial.json')
        ).rejects.toThrow(`Invalid backup file: missing "${missingKey}" array.`);
      }
    );

    it('leaves the existing database untouched when validation fails', async () => {
      const db = loadDbModule();
      const backup = loadBackupModule();
      await seedDatabase(db);

      writeFile(
        'file:///cache/partial.json',
        JSON.stringify({ app: 'OMEGA', data: { exercises: [] } })
      );
      await expect(backup.importBackup('file:///cache/partial.json')).rejects.toThrow(
        /missing "day_templates" array/
      );

      // Nothing was wiped by the failed import
      expect(await db.getAllExercises()).toHaveLength(2);
      expect(await db.getWorkoutLogForDate('2026-09-01')).not.toBeNull();
      expect((await db.getDayTemplate('Monday')).length).toBe(2);
    });

    it('rolls back the restore when a payload violates the schema', async () => {
      const db = loadDbModule();
      const backup = loadBackupModule();
      await seedDatabase(db);

      // Structurally valid, but the set references an exercise that is never inserted
      writeFile(
        'file:///cache/orphans.json',
        JSON.stringify({
          app: 'OMEGA',
          version: 1,
          exportedAt: new Date().toISOString(),
          data: {
            exercises: [],
            day_templates: [],
            workout_logs: [
              {
                id: 'wl_1',
                date: '2026-09-05',
                day_of_week: 'Saturday',
                notes: '',
                completed: 1,
              },
            ],
            workout_sets: [
              {
                id: 'ws_1',
                workout_log_id: 'wl_1',
                exercise_id: 'ex_missing',
                set_number: 1,
                weight: 10,
                reps: 10,
              },
            ],
          },
        })
      );

      await expect(backup.importBackup('file:///cache/orphans.json')).rejects.toThrow(
        /FOREIGN KEY constraint failed/i
      );

      // The transaction rolled back, so the previous data is still intact
      expect(await db.getAllExercises()).toHaveLength(2);
      expect(await db.getWorkoutLogForDate('2026-09-01')).not.toBeNull();
    });
  });

  describe('picker integration', () => {
    it('throws when the user cancels the picker', async () => {
      picker().__setNextPickerResult(null);

      await expect(loadBackupModule().pickAndImportBackup()).rejects.toThrow('Import cancelled.');
    });

    it('imports the file chosen in the picker', async () => {
      const db = loadDbModule();
      const backup = loadBackupModule();
      await seedDatabase(db);
      await backup.exportBackup();

      // Move the exported payload to the location the picker will report
      writeFile('file:///picked/omega_backup.json', readRawExportedText());
      picker().__setNextPickerResult('file:///picked/omega_backup.json');

      const restoredSets = await backup.pickAndImportBackup();

      expect(restoredSets).toBe(2);
      expect(await db.getAllExercises()).toHaveLength(2);
    });
  });
});
