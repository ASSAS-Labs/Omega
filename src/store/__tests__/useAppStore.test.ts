/**
 * Write ordering in the app store.
 *
 * The store's read batches are fire-and-forget at their call sites — the
 * Exercises tab refreshes the library from a focus effect while the user is
 * already tapping "+ Add" — so a write dispatched right afterwards has to wait
 * for those reads. Overlapping the two is what SQLite reports as
 * `database is locked`.
 *
 * `../services/database` is replaced by a factory mock here (rather than the
 * real SQLite mock) because the tests need to hold a read batch open and
 * observe when the write is allowed to start.
 */
import type * as StoreModule from '../useAppStore';
import type { Exercise } from '../../types';

jest.mock('../../services/database', () => ({
  getWeeklySplit: jest.fn(),
  getMuscleGroups: jest.fn(),
  getAllExercises: jest.fn(),
  saveWeeklySplit: jest.fn(),
  addExercise: jest.fn(),
}));

type DatabaseMock = {
  getWeeklySplit: jest.Mock;
  getMuscleGroups: jest.Mock;
  getAllExercises: jest.Mock;
  saveWeeklySplit: jest.Mock;
  addExercise: jest.Mock;
};

const database = () => require('../../services/database') as unknown as DatabaseMock;
const loadStore = () => (require('../useAppStore') as typeof StoreModule).useAppStore;

/** A promise whose settlement the test controls. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const BENCH_PRESS: Exercise = {
  id: 'ex_bench',
  name: 'Bench Press',
  muscleGroup: 'Chest',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('useAppStore', () => {
  beforeEach(() => {
    // Each test gets its own store instance, so no read batch leaks between them
    jest.resetModules();
  });

  it('waits for an in-flight read batch before dispatching a write', async () => {
    const db = database();
    const readBatch = deferred<Record<string, string[]>>();
    db.getWeeklySplit.mockReturnValue(readBatch.promise);
    db.getMuscleGroups.mockResolvedValue([]);
    db.getAllExercises.mockResolvedValue([]);
    db.addExercise.mockResolvedValue(BENCH_PRESS);

    const store = loadStore();

    // Focus effect refreshes the library (not awaited), then the user taps "+ Add"
    const refresh = store.getState().refreshData();
    const add = store.getState().addExercise('Bench Press', 'Chest');

    await Promise.resolve();
    expect(db.addExercise).not.toHaveBeenCalled();

    readBatch.resolve({ Monday: [] });
    await Promise.all([refresh, add]);

    expect(db.addExercise).toHaveBeenCalledWith('Bench Press', 'Chest');
    expect(store.getState().allExercises.map((e) => e.name)).toEqual(['Bench Press']);
  });

  it('still dispatches the write when the read batch it waits for fails', async () => {
    const db = database();
    const readBatch = deferred<Exercise[]>();
    db.getWeeklySplit.mockResolvedValue({});
    db.getMuscleGroups.mockResolvedValue([]);
    db.getAllExercises.mockReturnValue(readBatch.promise);
    db.addExercise.mockResolvedValue(BENCH_PRESS);

    const store = loadStore();
    const refresh = store.getState().refreshData();
    const rejected = expect(refresh).rejects.toThrow('read failed');
    const add = store.getState().addExercise('Bench Press', 'Chest');

    readBatch.reject(new Error('read failed'));

    await rejected;
    await add;

    expect(db.addExercise).toHaveBeenCalledWith('Bench Press', 'Chest');
    expect(store.getState().allExercises).toEqual([BENCH_PRESS]);
  });

  it('writes immediately when no read batch is in flight', async () => {
    const db = database();
    db.addExercise.mockResolvedValue(BENCH_PRESS);

    const store = loadStore();
    await store.getState().addExercise('Bench Press', 'Chest');

    expect(db.addExercise).toHaveBeenCalledTimes(1);
    expect(store.getState().allExercises).toEqual([BENCH_PRESS]);
  });
});
