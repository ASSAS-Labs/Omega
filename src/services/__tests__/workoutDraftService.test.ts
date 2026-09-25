/**
 * Tests for the crash-recovery draft service. AsyncStorage is replaced by the
 * in-memory manual mock in `__mocks__/@react-native-async-storage/async-storage.ts`,
 * which also exposes a hook to interleave a stray write with a discard.
 *
 * NOTE: the storage handle is loaded with `require` (not `jest.requireMock`) so
 * that it is the exact instance the service under test talks to.
 */
import type * as DraftService from '../workoutDraftService';
import type { WorkoutDraft } from '../workoutDraftService';

type StorageMock = {
  __hooks: { beforeRemove: ((key: string) => void) | null };
  __resetAsyncStorage: () => void;
  __getStore: () => Map<string, string>;
  default: Record<string, jest.Mock>;
};

const DRAFT_KEY = '@active_workout_draft';

const storage = () =>
  require('@react-native-async-storage/async-storage') as unknown as StorageMock;
const loadService = () => require('../workoutDraftService') as typeof DraftService;

function buildDraft(overrides: Partial<WorkoutDraft> = {}): WorkoutDraft {
  return {
    date: '2026-09-01',
    day: 'Tuesday',
    dayName: 'Pull Day',
    startedAt: 1_780_000_000_000,
    exerciseLogs: [
      {
        exercise: { id: 'ex_bench', name: 'Bench Press', muscleGroup: 'Chest' },
        previousSets: [{ setNumber: 1, weight: 80, reps: 8 }],
        sets: [
          { setNumber: 1, weight: '82.5', reps: '8' },
          { setNumber: 2, weight: '', reps: '' },
        ],
      },
    ],
    ...overrides,
  };
}

describe('workoutDraftService', () => {
  beforeEach(() => {
    storage().__resetAsyncStorage();
    jest.resetModules();
    // The service logs and recovers from expected storage failures
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('saving and retrieving', () => {
    it('round-trips a draft through storage without losing nested input', async () => {
      const service = loadService();
      const draft = buildDraft();

      await service.saveWorkoutDraft(draft);
      const restored = await service.getWorkoutDraft();

      expect(restored).toEqual(draft);
      expect(restored?.exerciseLogs[0].sets[0]).toEqual({ setNumber: 1, weight: '82.5', reps: '8' });
    });

    it('returns null when nothing has been drafted yet', async () => {
      expect(await loadService().getWorkoutDraft()).toBeNull();
    });

    it('overwrites the previous draft on the next auto-save', async () => {
      const service = loadService();

      await service.saveWorkoutDraft(buildDraft({ day: 'Monday' }));
      await service.saveWorkoutDraft(buildDraft({ day: 'Friday', dayName: 'Legs' }));

      const restored = await service.getWorkoutDraft();
      expect(restored?.day).toBe('Friday');
      expect(restored?.dayName).toBe('Legs');
    });

    it('rejects malformed stored payloads instead of hydrating a broken draft', async () => {
      const service = loadService();
      const store = storage().__getStore();

      store.set(DRAFT_KEY, 'not-json{');
      expect(await service.getWorkoutDraft()).toBeNull();

      store.set(DRAFT_KEY, JSON.stringify({ date: '2026-09-01' }));
      expect(await service.getWorkoutDraft()).toBeNull();

      store.set(DRAFT_KEY, JSON.stringify({ date: '2026-09-01', day: 'Tuesday', exerciseLogs: {} }));
      expect(await service.getWorkoutDraft()).toBeNull();

      store.set(DRAFT_KEY, 'null');
      expect(await service.getWorkoutDraft()).toBeNull();
    });

    it('survives a storage failure without throwing into the UI layer', async () => {
      const service = loadService();
      const setItem = storage().default.setItem;
      setItem.mockRejectedValueOnce(new Error('disk full'));

      await expect(service.saveWorkoutDraft(buildDraft())).resolves.toBeUndefined();
      expect(await service.getWorkoutDraft()).toBeNull();
    });

    it('returns null when the storage read itself fails', async () => {
      const service = loadService();
      storage().default.getItem.mockRejectedValueOnce(new Error('storage unavailable'));

      await expect(service.getWorkoutDraft()).resolves.toBeNull();
    });
  });

  describe('atomic discard', () => {
    it('clears a stored draft and leaves nothing behind', async () => {
      const service = loadService();
      await service.saveWorkoutDraft(buildDraft());

      await service.clearWorkoutDraft();

      expect(await service.getWorkoutDraft()).toBeNull();
      expect(storage().__getStore().has(DRAFT_KEY)).toBe(false);
    });

    it('wins over a debounced auto-save that lands mid-discard', async () => {
      const service = loadService();
      const draft = JSON.stringify(buildDraft());

      // Simulate a queued 500ms debounced auto-save writing the stale draft
      // right after the first delete inside clearWorkoutDraft()
      storage().__hooks.beforeRemove = (key) => {
        if (key === DRAFT_KEY) {
          storage().__getStore().set(DRAFT_KEY, draft);
          storage().__hooks.beforeRemove = null;
        }
      };

      await service.clearWorkoutDraft();

      expect(await service.getWorkoutDraft()).toBeNull();
      expect(storage().__getStore().has(DRAFT_KEY)).toBe(false);
    });

    it('never throws when the underlying storage is unavailable', async () => {
      const service = loadService();
      storage().default.removeItem.mockRejectedValueOnce(new Error('storage unavailable'));

      await expect(service.clearWorkoutDraft()).resolves.toBeUndefined();
    });
  });

  describe('concurrent state hydration', () => {
    it('resolves every parallel read to the same draft snapshot', async () => {
      const service = loadService();
      const draft = buildDraft();
      await service.saveWorkoutDraft(draft);

      const reads = await Promise.all([
        service.getWorkoutDraft(),
        service.getWorkoutDraft(),
        service.getWorkoutDraft(),
      ]);

      expect(reads).toHaveLength(3);
      for (const read of reads) {
        expect(read).toEqual(draft);
      }
    });

    it('keeps the last write when saves and reads are interleaved', async () => {
      const service = loadService();

      const latest = buildDraft({ day: 'Saturday', dayName: 'Push Day' });
      await Promise.all([
        service.saveWorkoutDraft(buildDraft({ day: 'Monday' })),
        service.saveWorkoutDraft(buildDraft({ day: 'Wednesday' })),
        service.saveWorkoutDraft(latest),
      ]);

      // The read waits behind the queued writes, so it observes the final state
      const [read] = await Promise.all([service.getWorkoutDraft()]);
      expect(read?.day).toBe('Saturday');
      expect(read?.dayName).toBe('Push Day');
    });

    it('hydrates nothing after a discard that races a read', async () => {
      const service = loadService();
      await service.saveWorkoutDraft(buildDraft());

      const [, read] = await Promise.all([service.clearWorkoutDraft(), service.getWorkoutDraft()]);

      expect(read).toBeNull();
      expect(await service.getWorkoutDraft()).toBeNull();
    });
  });
});
