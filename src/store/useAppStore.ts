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
      const [split, mGroups, exercises] = await Promise.all([
        db.getWeeklySplit(),
        db.getMuscleGroups(),
        db.getAllExercises(),
      ]);
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
    await db.saveWeeklySplit(newSplit);
    set({ weeklySplit: newSplit });
  },

  addExercise: async (name, muscleGroupName) => {
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
    const [split, mGroups, exercises] = await Promise.all([
      db.getWeeklySplit(),
      db.getMuscleGroups(),
      db.getAllExercises(),
    ]);
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
