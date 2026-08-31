import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayOfWeek } from '../types';

const DRAFT_KEY = '@active_workout_draft';

export interface DraftSetRow {
  setNumber: number;
  weight: string;
  reps: string;
}

export interface DraftExercise {
  exercise: {
    id: string;
    name: string;
    muscleGroup?: string;
  };
  previousSets: { setNumber: number; weight: number; reps: number }[];
  sets: DraftSetRow[];
}

export interface WorkoutDraft {
  date: string;
  day: DayOfWeek;
  dayName?: string;
  startedAt: number; // epoch ms
  exerciseLogs: DraftExercise[];
}

/**
 * Persists an in-progress logging session so it survives app restarts /
 * crashes. Auto-saved by ActiveWorkoutScreen on every change (debounced).
 */
export async function saveWorkoutDraft(draft: WorkoutDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.warn('Failed to save workout draft:', err);
  }
}

export async function getWorkoutDraft(): Promise<WorkoutDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.date || !parsed.day || !Array.isArray(parsed.exerciseLogs)) {
      return null;
    }
    return parsed as WorkoutDraft;
  } catch (err) {
    console.warn('Failed to read workout draft:', err);
    return null;
  }
}

export async function clearWorkoutDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
    // Verify the key is completely erased before resolving, so parent
    // screens' focus handlers can never observe a stale draft. Retry once
    // in case a pending debounced auto-save slipped in between.
    const remaining = await AsyncStorage.getItem(DRAFT_KEY);
    if (remaining !== null) {
      await AsyncStorage.removeItem(DRAFT_KEY);
    }
  } catch (err) {
    console.warn('Failed to clear workout draft:', err);
  }
}
