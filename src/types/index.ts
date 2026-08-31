import type { NavigatorScreenParams } from '@react-navigation/native';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

// Navigation param lists (shared between App.tsx and screen components)
export type WorkoutStackParamList = {
  WorkoutDays: undefined;
  ActiveWorkout: {
    date: string;
    day: DayOfWeek;
    dayName?: string;
    mode?: 'template' | 'logging';
    resume?: '1';
  };
};

export type RootTabParamList = {
  Dashboard: undefined;
  Workout: NavigatorScreenParams<WorkoutStackParamList> | undefined;
  Exercises: undefined;
  Analytics: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList> | undefined;
  SplitSetup: undefined;
};

export interface MuscleGroup {
  id: string;
  name: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string;
  createdAt?: string;
}

export interface WeeklySplitDay {
  dayOfWeek: DayOfWeek;
  muscleGroupIds: string[];
}

export interface WorkoutSet {
  id?: string;
  workoutLogId?: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
}

export interface WorkoutLog {
  id: string;
  date: string; // ISO String (YYYY-MM-DD)
  dayOfWeek: DayOfWeek;
  notes?: string;
  completed: boolean;
  sets: WorkoutSet[];
}

export interface PreviousSet {
  setNumber: number;
  weight: number;
  reps: number;
}

export interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  date: string;
  maxWeight: number;
  totalVolume: number;
  sets: PreviousSet[];
}

export interface DailyCompliance {
  date: string; // YYYY-MM-DD
  dayOfWeek: DayOfWeek;
  isScheduled: boolean;
  isCompleted: boolean;
  muscleGroupNames: string[];
}
