/**
 * Tests for the crash-recovery draft service. AsyncStorage is replaced by the
 * in-memory manual mock in `__mocks__/@react-native-async-storage/async-storage.ts`.
 *
 * NOTE: the storage handle is loaded with `require` (not `jest.requireMock`) so
 * that it is the exact instance the service under test talks to.
 */
import type * as DraftService from '../workoutDraftService';
import type { WorkoutDraft } from '../workoutDraftService';

type StorageMock = {
  __resetAsyncStorage: () => void;
  __getStore: () => Map<string, string>;
  default: Record<string, jest.Mock>;
};

const DRAFT_KEY = '@active_workout_draft';
const DRAFT_VERSION = 1;

const storage = () =>
  require('@react-native-async-storage/async-storage') as unknown as StorageMock;
const loadService = () => require('../workoutDraftService') as typeof DraftService;

/**
 * The stored payload for `buildDraft()`, i.e. what `saveWorkoutDraft` leaves in
 * storage before it stamps the version and write time.
 */
function draftInput(overrides: Partial<WorkoutDraft> = {}) {
  const { version, updatedAt, ...input } = { ...buildDraft(), ...overrides } as WorkoutDraft;
  void version;
  void updatedAt;
  return input;
}

/** The payload a round-trip test should expect back: the input, plus the two stamped fields. */
function stampedDraft(input: ReturnType<typeof draftInput>, updatedAt: number): WorkoutDraft {
  return { ...input, version: DRAFT_VERSION, updatedAt };
}

function buildDraft(overrides: Partial<WorkoutDraft> = {}): WorkoutDraft {
  return {
    version: 1,
    updatedAt: 1_780_000_000_000,
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('saving and retrieving', () => {
    it('round-trips a draft through storage without losing nested input', async () => {
      const service = loadService();
      const input = draftInput();

      await service.saveWorkoutDraft(input);

      // The service owns `updatedAt` (it stamps the write time), so the
      // comparison is against the payload it stored rather than the input.
      const stored = JSON.parse(storage().__getStore().get(DRAFT_KEY) as string) as WorkoutDraft;
      expect(await service.getWorkoutDraft()).toEqual(stored);
      expect(await service.getWorkoutDraft()).toEqual(stampedDraft(input, stored.updatedAt));
      expect(stored.exerciseLogs[0].sets[0]).toEqual({ setNumber: 1, weight: '82.5', reps: '8' });
    });

    it('stamps the stored payload with a version and the write time', async () => {
      const service = loadService();
      const before = Date.now();

      await service.saveWorkoutDraft(draftInput());

      const stored = JSON.parse(storage().__getStore().get(DRAFT_KEY) as string);
      expect(stored.version).toBe(service.DRAFT_VERSION);
      expect(stored.updatedAt).toBeGreaterThanOrEqual(before);
      expect(stored.updatedAt).toBeLessThanOrEqual(Date.now());
    });

    it('returns null when nothing has been drafted yet', async () => {
      expect(await loadService().getWorkoutDraft()).toBeNull();
    });

    it('overwrites the previous draft on the next auto-save', async () => {
      const service = loadService();

      await service.saveWorkoutDraft(draftInput({ day: 'Monday' }));
      await service.saveWorkoutDraft(draftInput({ day: 'Friday', dayName: 'Legs' }));

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

    it('rejects a payload whose nested sets are the wrong shape', async () => {
      const service = loadService();
      const store = storage().__getStore();
      const draft = draftInput();

      // Structurally plausible at the top level, corrupt underneath: the old
      // implementation cast this straight to `WorkoutDraft` and the screen
      // crashed on the first `.trim()` of a missing field.
      const cases = [
        { ...draft, exerciseLogs: [{ ...draft.exerciseLogs[0], sets: [{}] }] },
        { ...draft, exerciseLogs: [{ ...draft.exerciseLogs[0], sets: 'nope' }] },
        { ...draft, exerciseLogs: [{ ...draft.exerciseLogs[0], exercise: { id: 'ex_bench' } }] },
        { ...draft, exerciseLogs: [{ ...draft.exerciseLogs[0], previousSets: [{ weight: 80 }] }] },
        { ...draft, startedAt: 'yesterday' },
      ];

      for (const broken of cases) {
        store.set(DRAFT_KEY, JSON.stringify(broken));
        expect(await service.getWorkoutDraft()).toBeNull();
      }
    });

    it('expires a draft that is older than the recovery window', async () => {
      const service = loadService();
      const store = storage().__getStore();
      const stale = {
        ...draftInput(),
        updatedAt: Date.now() - service.DRAFT_MAX_AGE_MS - 1,
      };
      store.set(DRAFT_KEY, JSON.stringify(stale));

      expect(await service.getWorkoutDraft()).toBeNull();
      expect(store.has(DRAFT_KEY)).toBe(false);
    });

    it('keeps a draft that is still inside the recovery window', async () => {
      const service = loadService();
      const store = storage().__getStore();
      const fresh = {
        ...draftInput(),
        updatedAt: Date.now() - service.DRAFT_MAX_AGE_MS + 60_000,
      };
      store.set(DRAFT_KEY, JSON.stringify(fresh));

      expect(await service.getWorkoutDraft()).not.toBeNull();
      expect(store.has(DRAFT_KEY)).toBe(true);
    });

    it('propagates a storage write failure instead of reporting success', async () => {
      const service = loadService();
      storage().default.setItem.mockRejectedValueOnce(new Error('disk full'));

      await expect(service.saveWorkoutDraft(draftInput())).rejects.toThrow('disk full');
      expect(await service.getWorkoutDraft()).toBeNull();
    });

    it('propagates a storage read failure instead of reporting "no draft"', async () => {
      const service = loadService();
      storage().default.getItem.mockRejectedValueOnce(new Error('storage unavailable'));

      await expect(service.getWorkoutDraft()).rejects.toThrow('storage unavailable');
    });
  });

  describe('atomic discard', () => {
    it('clears a stored draft and leaves nothing behind', async () => {
      const service = loadService();
      await service.saveWorkoutDraft(draftInput());

      await service.clearWorkoutDraft();

      expect(await service.getWorkoutDraft()).toBeNull();
      expect(storage().__getStore().has(DRAFT_KEY)).toBe(false);
    });

    it('never lets an in-flight save resurrect a discarded draft', async () => {
      const service = loadService();
      await service.saveWorkoutDraft(draftInput());

      // The debounced auto-save that was already scheduled when the user hit
      // "Finish & Save": it is requested after the discard and must be dropped
      // by the generation guard rather than written back over the cleared key.
      const straggler = service.saveWorkoutDraft(
        draftInput({ day: 'Saturday', dayName: 'Push Day' })
      );
      await service.clearWorkoutDraft();
      await straggler;

      expect(await service.getWorkoutDraft()).toBeNull();
      expect(storage().__getStore().has(DRAFT_KEY)).toBe(false);
    });

    it('keeps a save requested after the discard', async () => {
      const service = loadService();
      await service.saveWorkoutDraft(draftInput());

      await service.clearWorkoutDraft();
      // A brand-new session starts with a fresh generation and its auto-saves
      // must still land.
      await service.saveWorkoutDraft(draftInput({ day: 'Saturday', dayName: 'Push Day' }));

      expect((await service.getWorkoutDraft())?.dayName).toBe('Push Day');
    });

    it('propagates a storage failure rather than pretending the draft is gone', async () => {
      const service = loadService();
      storage().default.removeItem.mockRejectedValueOnce(new Error('storage unavailable'));

      await expect(service.clearWorkoutDraft()).rejects.toThrow('storage unavailable');
    });
  });

  describe('concurrent state hydration', () => {
    it('resolves every parallel read to the same draft snapshot', async () => {
      const service = loadService();
      await service.saveWorkoutDraft(draftInput());

      const stored = JSON.parse(storage().__getStore().get(DRAFT_KEY) as string) as WorkoutDraft;
      const reads = await Promise.all([
        service.getWorkoutDraft(),
        service.getWorkoutDraft(),
        service.getWorkoutDraft(),
      ]);

      expect(reads).toHaveLength(3);
      for (const read of reads) {
        expect(read).toEqual(stored);
      }
    });

    it('keeps the last write when saves and reads are interleaved', async () => {
      const service = loadService();

      const latest = draftInput({ day: 'Saturday', dayName: 'Push Day' });
      await Promise.all([
        service.saveWorkoutDraft(draftInput({ day: 'Monday' })),
        service.saveWorkoutDraft(draftInput({ day: 'Wednesday' })),
        service.saveWorkoutDraft(latest),
      ]);

      // The read waits behind the queued writes, so it observes the final state
      const [read] = await Promise.all([service.getWorkoutDraft()]);
      expect(read?.day).toBe('Saturday');
      expect(read?.dayName).toBe('Push Day');
    });

    it('hydrates nothing after a discard that races a read', async () => {
      const service = loadService();
      await service.saveWorkoutDraft(draftInput());

      const [, read] = await Promise.all([service.clearWorkoutDraft(), service.getWorkoutDraft()]);

      expect(read).toBeNull();
      expect(await service.getWorkoutDraft()).toBeNull();
    });
  });
});
