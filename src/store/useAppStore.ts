import { create } from 'zustand';
import { DayOfWeek, MuscleGroup, Exercise } from '../types';
import * as db from '../services/database';
import { formatISODate } from '../utils/dateUtils';

interface AppState {
  weeklySplit: Record<DayOfWeek, string[]>;
  muscleGroups: MuscleGroup[];
  allExercises: Exercise[];
  isLoading: boolean;
  selectedDate: string; // YYYY-MM-DD format
  workoutSavedVersion: number; // bumped after each saved workout to trigger dashboard refresh
  
  // Actions
  initStore: () => Promise<void>;
  updateSplit: (split: Record<DayOfWeek, string[]>) => Promise<void>;
  addExercise: (name: string, muscleGroupName: string) => Promise<Exercise>;
  setSelectedDate: (date: string) => void;
  refreshData: () => Promise<void>;
  notifyWorkoutSaved: () => void;
}

/**
 * The store's read batches (`initStore`, `refreshData`) are fire-and-forget at
 * several call sites — a screen's focus effect refreshes the library while the
 * user is already tapping through it — so a write dispatched right afterwards
 * can still have those reads in flight. SQLite serializes the two on the
 * connection, and a write overlapping an unfinished read is what surfaced as
 * `database is locked`. Writes therefore wait for the pending batch first.
 */
let pendingReads: Promise<void> = Promise.resolve();

/** Marks a read batch as pending, returning it unchanged to the caller. */
function trackReads<T>(reads: Promise<T>): Promise<T> {
  // A failed read must never block (or fail) a write that follows it.
  pendingReads = reads.then(
    () => {},
    () => {}
  );
  return reads;
}

/** Resolves once every read batch started so far has settled. */
async function awaitPendingReads(): Promise<void> {
  await pendingReads;
}

export const useAppStore = create<AppState>((set, get) => ({
  weeklySplit: {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  },
  muscleGroups: [],
  allExercises: [],
  isLoading: true,
  selectedDate: formatISODate(new Date()),
  workoutSavedVersion: 0,

  initStore: async () => {
    set({ isLoading: true });
    try {
      // Wait for the shared connection to be fully up — open, connection
      // pragmas (busy_timeout / WAL / foreign_keys), schema build or repair and
      // the muscle-group seeding — before the first query. Those steps are
      // writes on the same connection, and the dashboard's own reads are gated
      // on `isLoading`, so nothing overlaps schema setup on a cold start.
      await db.getDB();

      const [split, mGroups, exercises] = await trackReads(
        Promise.all([db.getWeeklySplit(), db.getMuscleGroups(), db.getAllExercises()])
      );
      set({
        weeklySplit: split,
        muscleGroups: mGroups,
        allExercises: exercises,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to initialize store:', err);
      set({ isLoading: false });
    }
  },

  updateSplit: async (newSplit) => {
    await awaitPendingReads();
    await db.saveWeeklySplit(newSplit);
    set({ weeklySplit: newSplit });
  },

  addExercise: async (name, muscleGroupName) => {
    await awaitPendingReads();
    const newEx = await db.addExercise(name, muscleGroupName);
    set((state) => ({
      allExercises: [...state.allExercises, newEx],
    }));
    return newEx;
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
  },

  refreshData: async () => {
    const [split, mGroups, exercises] = await trackReads(
      Promise.all([db.getWeeklySplit(), db.getMuscleGroups(), db.getAllExercises()])
    );
    set({
      weeklySplit: split,
      muscleGroups: mGroups,
      allExercises: exercises,
    });
  },

  notifyWorkoutSaved: () => {
    set((state) => ({ workoutSavedVersion: state.workoutSavedVersion + 1 }));
  },
}));
