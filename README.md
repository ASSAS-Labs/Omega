# Omega Gym Tracker

A local-first, privacy-focused workout tracking and progressive overload management application built with React Native, Expo, TypeScript, and SQLite.

---

## Overview

Omega Gym Tracker is built for lifters who prioritize performance data, progressive overload, and routine consistency without cloud lock-in, advertisements, or account requirements. All workout history, custom exercises, routine templates, and weekly splits are stored locally on-device using an embedded SQLite database.

---

## Core Features

### 1. Interactive Weekly Dashboard
- **7-Day Dynamic Calendar Strip**: Visual completion indicators, today highlight, and day-by-day workout inspection.
- **Real-Time Date Synchronization**: Automatic midnight rollover detection and foreground app-state listeners to ensure the active day is always accurate.
- **Streak & Consistency Metrics**: Active training streaks and 30-day scheduled-vs-completed compliance rate.
- **One-Tap Session Management**: Fast access to launch the day's scheduled workout or inspect completed session logs.

### 2. Routine Planning & Day Templates
- **Per-Day Routine Builder**: Assign exercises and target set counts for each day of the week (Monday through Sunday).
- **Exercise Sequencing**: Reorder and organize exercises per session to match your gym workflow.
- **Direct Library Integration**: Easily browse, add, and remove movements directly within routine templates.

### 3. Active Workout Logger & Progressive Overload Tracking
- **Previous Session Benchmarks**: Real-time display of previous weights and reps for every exercise during live logging.
- **Flexible Set Logging**: Dynamic set row addition/removal with inline weight and repetition recording.
- **Session Notes**: Attach contextual observations, RPE notes, or cues to any completed workout.
- **Robust Persistence**: Atomic SQLite transactions guarantee clean logging and instant history recall.

### 4. Global Exercise Library
- **Full CRUD Management**: Create, view, edit, and delete custom exercises categorized by muscle groups.
- **Supported Muscle Groups**: Chest, Back, Legs, Shoulders, Biceps, Triceps, Forearms, Abs & Core, and Calves.
- **Search & Categorization**: Real-time filtering and case-insensitive uniqueness validation.
- **Cascade Integrity**: Safe deletion handling that cleans up routine templates and logs without database corruption.

### 5. Customizable Weekly Split
- **Flexible Split Configurations**: Configure target muscle groups per day to fit Push/Pull/Legs (PPL), Upper/Lower, Arnold Split, Bro Split, or custom regimens.
- **Visual Muscle Chips**: Toggle and customize muscle groups with instant UI feedback.

### 6. Analytics & Progression Visualizer
- **Progressive Overload Charts**: Interactive line charts tracking Max Weight (1RM / Top Set) and Total Volume over time using `react-native-gifted-charts`.
- **Custom Time Windows**: Filter progression trends across session, weekly, and monthly scopes.
- **Fullscreen Chart Inspector**: Expandable view for detailed data-point inspection.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React Native](https://reactnative.dev/) (0.81) / [Expo](https://expo.dev/) (SDK 54) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (5.9) |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) (v5) |
| **Local Database** | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (SQLite 3 with foreign key enforcement) |
| **Navigation** | [React Navigation](https://reactnavigation.org/) v7 (Bottom Tabs + Native Stack) |
| **Data Visualization** | [react-native-gifted-charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) & [react-native-svg](https://github.com/software-mansion/react-native-svg) |
| **Gestures & Animations** | [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) & [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) |
| **Date Utilities** | [date-fns](https://date-fns.org/) |

---

## Database Architecture

The local SQLite schema enforces foreign key constraints and runs idempotent migrations on application startup.

```
+------------------+         +------------------+         +--------------------+
|  muscle_groups   |         |    exercises     |         |   day_templates    |
+------------------+         +------------------+         +--------------------+
| id (PK)          |         | id (PK)          |         | day_of_week (PK)   |
| name             |         | name (UNIQUE)    |<--------| exercise_id (PK,FK)|
+------------------+         | muscleGroup      |         | target_sets        |
         ^                   | createdAt        |         | sort_order         |
         |                   +------------------+         +--------------------+
         |                            ^
+------------------+                  |
|   weekly_split   |                  |
+------------------+                  |
| day_of_week (PK) |                  |
| muscle_group_id  |                  |
+------------------+                  |
                                      |
+------------------+         +------------------+
|   workout_logs   |         |   workout_sets   |
+------------------+         +------------------+
| id (PK)          |<--------| workout_log_id   |
| date             |         | exercise_id (FK) |--------+
| day_of_week      |         | set_number       |
| notes            |         | weight           |
| completed        |         | reps             |
+------------------+         +------------------+
```

---

## Project Structure

```
counterapp/
├── assets/                  # App icons and splash assets
├── src/
│   ├── hooks/
│   │   └── useTimeSync.ts   # Clock and app-state foreground synchronization
│   ├── screens/
│   │   ├── ActiveWorkoutScreen.tsx  # Workout logger and template runner
│   │   ├── AnalyticsScreen.tsx      # Volume and 1RM progress graphs
│   │   ├── DashboardScreen.tsx      # Weekly strip, status card, streaks
│   │   ├── ExercisesScreen.tsx      # Global exercise manager (CRUD)
│   │   ├── SplitSetupScreen.tsx     # Weekly split configuration
│   │   └── WorkoutDaysScreen.tsx    # Day routine template manager
│   ├── services/
│   │   └── database.ts      # SQLite initialization, schema migrations, and queries
│   ├── store/
│   │   └── useAppStore.ts   # Global Zustand store for cached state
│   ├── theme/
│   │   └── colors.ts        # OLED dark-mode palette, typography, and spacing tokens
│   ├── types/
│   │   └── index.ts         # Shared TypeScript interfaces and navigation param types
│   └── utils/
│       └── dateUtils.ts     # Date formatting and week calculation helpers
├── App.tsx                  # App entry point, navigation containers, and theme config
├── app.json                 # Expo application configuration
├── eas.json                 # Expo Application Services build profiles
├── package.json             # Project dependencies and run scripts
└── tsconfig.json            # TypeScript compiler configuration
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/go) app on your physical mobile device or an Android/iOS emulator

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/RonnieRobert/Gym-Tracker-App.git
   cd Gym-Tracker-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the Expo development server:

```bash
npx expo start
```

- Press `a` to launch on a connected Android device or emulator.
- Press `i` to launch on an iOS simulator.
- Scan the QR code displayed in the terminal with the **Expo Go** mobile app (Android) or the Camera app (iOS).

### Building Production APK (Android)

Using Expo Application Services (EAS):

```bash
# Install EAS CLI globally if not already installed
npm install -g eas-cli

# Log in to your Expo account
eas login

# Build a standalone Android APK
eas build -p android --profile preview
```

---

## Design Principles

- **OLED Dark Aesthetic**: Tailored `#0D0D0E` surface hierarchy with high-contrast text and crisp emerald/cyan accents for minimum eye strain during training sessions.
- **Zero Friction Logging**: Minimal taps required to record sets; automatic pre-filling of target sets from templates with previous session reference values.
- **Privacy & Ownership**: 100% offline-first. Your training data lives exclusively on your device.

---

## License

This project is open source and available under the [MIT License](LICENSE).
