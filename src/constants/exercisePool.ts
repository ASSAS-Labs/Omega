// Static catalog of common gym movements. Every entry is mapped to one of the
// app's nine canonical seeded muscle groups (below) so exercises added from the
// pool surface correctly in Weekly-Split-filtered day tiles and the routine
// builder's picker. No images — just name + muscleGroup.
//
// Canonical group names (must match src/services/database.ts seeds):
//   Back, Biceps, Triceps, Forearms, Chest, Legs, Abs & Core, Shoulders, Calves

export interface PoolExercise {
  name: string;
  muscleGroup:
    | 'Back'
    | 'Biceps'
    | 'Triceps'
    | 'Forearms'
    | 'Chest'
    | 'Legs'
    | 'Abs & Core'
    | 'Shoulders'
    | 'Calves';
}

export const EXERCISE_POOL: PoolExercise[] = [
  // --- CHEST ---
  { name: 'Barbell Flat Bench Press', muscleGroup: 'Chest' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'Chest' },
  { name: 'Incline Barbell Bench Press', muscleGroup: 'Chest' },
  { name: 'Decline Barbell Bench Press', muscleGroup: 'Chest' },
  { name: 'Dumbbell Chest Fly', muscleGroup: 'Chest' },
  { name: 'Cable Crossover', muscleGroup: 'Chest' },
  { name: 'Pec Deck Machine Fly', muscleGroup: 'Chest' },
  { name: 'Dips (Chest Leaned)', muscleGroup: 'Chest' },
  { name: 'Push-ups', muscleGroup: 'Chest' },
  { name: 'Dumbbell Pullover', muscleGroup: 'Chest' },
  { name: 'Machine Chest Press', muscleGroup: 'Chest' },

  // --- BACK ---
  { name: 'Conventional Deadlift', muscleGroup: 'Back' },
  { name: 'Barbell Bent-Over Row', muscleGroup: 'Back' },
  { name: 'Lat Pulldown (Wide Grip)', muscleGroup: 'Back' },
  { name: 'Lat Pulldown (Close Neutral Grip)', muscleGroup: 'Back' },
  { name: 'Seated Cable Row', muscleGroup: 'Back' },
  { name: 'Pull-ups', muscleGroup: 'Back' },
  { name: 'Chin-ups', muscleGroup: 'Back' },
  { name: 'Single-Arm Dumbbell Row', muscleGroup: 'Back' },
  { name: 'T-Bar Row', muscleGroup: 'Back' },
  { name: 'Chest-Supported T-Bar Row', muscleGroup: 'Back' },
  { name: 'Straight-Arm Cable Pushdown', muscleGroup: 'Back' },
  { name: 'Rack Pulls', muscleGroup: 'Back' },
  { name: 'Hyperextensions (Back Extensions)', muscleGroup: 'Back' },

  // --- SHOULDERS ---
  { name: 'Overhead Barbell Press (OHP)', muscleGroup: 'Shoulders' },
  { name: 'Seated Dumbbell Shoulder Press', muscleGroup: 'Shoulders' },
  { name: 'Dumbbell Lateral Raise', muscleGroup: 'Shoulders' },
  { name: 'Cable Lateral Raise', muscleGroup: 'Shoulders' },
  { name: 'Arnold Press', muscleGroup: 'Shoulders' },
  { name: 'Face Pulls', muscleGroup: 'Shoulders' },
  { name: 'Rear Delt Reverse Fly (Pec Deck)', muscleGroup: 'Shoulders' },
  { name: 'Dumbbell Rear Delt Fly', muscleGroup: 'Shoulders' },
  { name: 'Barbell Front Raise', muscleGroup: 'Shoulders' },
  { name: 'Dumbbell Front Raise', muscleGroup: 'Shoulders' },
  { name: 'Barbell Upright Row', muscleGroup: 'Shoulders' },
  { name: 'Machine Shoulder Press', muscleGroup: 'Shoulders' },

  // --- BICEPS ---
  { name: 'Barbell Standing Bicep Curl', muscleGroup: 'Biceps' },
  { name: 'EZ Bar Preacher Curl', muscleGroup: 'Biceps' },
  { name: 'Dumbbell Hammer Curl', muscleGroup: 'Biceps' },
  { name: 'Incline Dumbbell Curl', muscleGroup: 'Biceps' },
  { name: 'Concentration Curl', muscleGroup: 'Biceps' },
  { name: 'Cable Rope Bicep Curl', muscleGroup: 'Biceps' },
  { name: 'Spider Curl', muscleGroup: 'Biceps' },
  { name: 'Bayesian Cable Curl', muscleGroup: 'Biceps' },
  { name: 'Machine Bicep Curl', muscleGroup: 'Biceps' },

  // --- TRICEPS ---
  { name: 'Tricep Rope Cable Pushdown', muscleGroup: 'Triceps' },
  { name: 'Straight Bar Tricep Pushdown', muscleGroup: 'Triceps' },
  { name: 'Skull Crushers (EZ Bar)', muscleGroup: 'Triceps' },
  { name: 'Overhead Cable Tricep Extension', muscleGroup: 'Triceps' },
  { name: 'Single-Arm Dumbbell Overhead Extension', muscleGroup: 'Triceps' },
  { name: 'Close-Grip Bench Press', muscleGroup: 'Triceps' },
  { name: 'Parallel Bar Dips (Upright)', muscleGroup: 'Triceps' },
  { name: 'Bench Dips', muscleGroup: 'Triceps' },
  { name: 'Cable Kickbacks', muscleGroup: 'Triceps' },

  // --- FOREARMS ---
  { name: 'Barbell Wrist Curl', muscleGroup: 'Forearms' },
  { name: 'Barbell Reverse Wrist Curl', muscleGroup: 'Forearms' },
  { name: 'Dumbbell Wrist Curl', muscleGroup: 'Forearms' },
  { name: 'Reverse Barbell Curl', muscleGroup: 'Forearms' },
  { name: 'Farmer’s Walk', muscleGroup: 'Forearms' },
  { name: 'Dead Hang', muscleGroup: 'Forearms' },
  { name: 'Wrist Roller Extension', muscleGroup: 'Forearms' },

  // --- LEGS ---
  { name: 'Barbell Back Squat', muscleGroup: 'Legs' },
  { name: 'Barbell Front Squat', muscleGroup: 'Legs' },
  { name: 'Leg Press', muscleGroup: 'Legs' },
  { name: 'Hack Squat Machine', muscleGroup: 'Legs' },
  { name: 'Romanian Deadlift (Barbell RDL)', muscleGroup: 'Legs' },
  { name: 'Dumbbell Romanian Deadlift', muscleGroup: 'Legs' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'Legs' },
  { name: 'Walking Dumbbell Lunges', muscleGroup: 'Legs' },
  { name: 'Leg Extension Machine', muscleGroup: 'Legs' },
  { name: 'Lying Hamstring Leg Curl', muscleGroup: 'Legs' },
  { name: 'Seated Hamstring Leg Curl', muscleGroup: 'Legs' },
  { name: 'Barbell Hip Thrust', muscleGroup: 'Legs' },
  { name: 'Goblet Squat', muscleGroup: 'Legs' },

  // --- CALVES ---
  { name: 'Standing Barbell Calf Raise', muscleGroup: 'Calves' },
  { name: 'Standing Dumbbell Calf Raise', muscleGroup: 'Calves' },
  { name: 'Seated Calf Raise Machine', muscleGroup: 'Calves' },
  { name: 'Leg Press Calf Raise', muscleGroup: 'Calves' },
  { name: 'Smith Machine Calf Raise', muscleGroup: 'Calves' },
  { name: 'Donkey Calf Raise', muscleGroup: 'Calves' },

  // --- ABS & CORE ---
  { name: 'Hanging Leg Raise', muscleGroup: 'Abs & Core' },
  { name: 'Hanging Knee Raise', muscleGroup: 'Abs & Core' },
  { name: 'Cable Rope Kneeling Crunch', muscleGroup: 'Abs & Core' },
  { name: 'Ab Wheel Rollout', muscleGroup: 'Abs & Core' },
  { name: 'Standard Plank', muscleGroup: 'Abs & Core' },
  { name: 'Side Plank', muscleGroup: 'Abs & Core' },
  { name: 'Decline Bench Sit-Up', muscleGroup: 'Abs & Core' },
  { name: 'Russian Twists', muscleGroup: 'Abs & Core' },
  { name: 'Cable Woodchopper', muscleGroup: 'Abs & Core' },
  { name: 'Captain’s Chair Leg Raise', muscleGroup: 'Abs & Core' },
];
