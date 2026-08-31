# Omega Gym Tracker

> **A local-first, privacy-focused workout tracker built around progressive overload.**

Track workouts, build routines, monitor progression, and analyze your training history — **without accounts, advertisements, or cloud lock-in.**

Built with **React Native · Expo · TypeScript · SQLite**

---

## Preview

<p align="center">
  <img src="assets/screenshots/01_dashboard.png" width="180"/>
  <img src="assets/screenshots/02_exercise_library.png" width="180"/>
  <img src="assets/screenshots/03_settings.png" width="180"/>
  <img src="assets/screenshots/04_analytics.png" width="180"/>
</p>

### Demo

<!-- Add a short GIF/video here -->

---

## Why Omega?

Most workout trackers are built around accounts, cloud services, subscriptions, or excessive complexity.

**Omega takes a different approach:**

* **Privacy-first** — workout data stays on the device
* **Zero-friction logging** — designed for quick set recording during workouts
* **Progressive overload focused** — previous performance is visible while logging
* **Offline-first** — core functionality does not depend on an internet connection
* **SQLite persistence** — structured relational storage instead of temporary app state
* **Flexible routines** — configure your own weekly training split

---

# Features

## Interactive Dashboard

* 7-day workout calendar
* Daily workout status
* Active training streak
* 30-day scheduled vs completed compliance
* One-tap access to scheduled workouts
* Automatic date synchronization when the app returns to the foreground

## Workout Logging

* Start workouts directly from daily routines
* Log weight and repetitions per set
* Add/remove sets dynamically
* View previous-session performance while training
* Add workout notes
* Atomic SQLite transactions for reliable persistence

## Routine Builder

Create your own training structure:

* Monday–Sunday routine configuration
* Exercise ordering
* Target set counts
* Custom weekly splits
* PPL
* Upper/Lower
* Arnold Split
* Bro Split
* Fully custom routines

## Exercise Library

* Create custom exercises
* Edit exercises
* Delete exercises
* Muscle-group categorization
* Real-time search
* Case-insensitive uniqueness validation
* Referential integrity through SQLite foreign keys

## Progress Analytics

Track your performance over time with:

* Estimated 1RM / top-set progression
* Total training volume
* Session-based trends
* Weekly trends
* Monthly trends
* Interactive charts
* Fullscreen chart inspection

---

# Architecture

Omega follows a layered architecture separating UI, state, persistence, and domain utilities.

```text
React Native UI
      │
      ▼
   Screens
      │
      ├──────────────► Zustand Store
      │
      ▼
  Service Layer
      │
      ▼
   SQLite
      │
      ▼
Relational Workout Data
```

### Main layers

| Layer       | Responsibility                                |
| ----------- | --------------------------------------------- |
| `screens/`  | Application UI and user interaction           |
| `services/` | SQLite initialization, migrations and queries |
| `store/`    | Global application state and cached data      |
| `hooks/`    | Reusable application behaviour                |
| `utils/`    | Date and domain utilities                     |
| `types/`    | Shared TypeScript contracts                   |
| `theme/`    | Design tokens and visual system               |

---

# Database Design

The application uses **SQLite with foreign-key enforcement and idempotent migrations**.

```text
muscle_groups
      │
      ▼
  exercises ◄──────── day_templates
      │
      │
      ▼
 workout_sets ◄──── workout_logs
```

The schema separates:

* Exercises
* Muscle groups
* Weekly splits
* Day templates
* Workout sessions
* Individual workout sets

This allows workout history and routine configuration to remain structured and queryable.

---

# Tech Stack

| Technology                 | Purpose                     |
| -------------------------- | --------------------------- |
| React Native               | Mobile UI                   |
| Expo SDK 54                | Application/runtime tooling |
| TypeScript                 | Type-safe development       |
| Zustand                    | State management            |
| Expo SQLite                | Local persistence           |
| React Navigation           | Navigation                  |
| React Native Gifted Charts | Analytics                   |
| React Native SVG           | Chart rendering             |
| Reanimated                 | Animations                  |
| Gesture Handler            | Touch interactions          |
| date-fns                   | Date calculations           |

---

# CI/CD

Omega uses **GitHub Actions** to automatically validate changes.

```text
Code Change
     │
     ▼
GitHub Actions
     │
     ├── Install dependencies
     ├── Type checking
     ├── Lint / validation
     └── Build validation
            │
            ▼
         Passed
```

This prevents broken changes from being treated as production-ready code.

---

# Getting Started

### Prerequisites

* Node.js 18+
* npm
* Expo Go or Android/iOS development environment

### Installation

```bash
git clone https://github.com/RonnieRobert/Gym-Tracker-App.git

cd Gym-Tracker-App

npm install
```

### Run locally

```bash
npx expo start
```

Then launch using:

```text
a -> Android
i -> iOS
```

or scan the Expo QR code with a compatible device.

---

# Build Android APK

Install EAS CLI:

```bash
npm install -g eas-cli
```

Login:

```bash
eas login
```

Build:

```bash
eas build -p android --profile preview
```

---

# Design Principles

### Zero-Friction Logging

The application minimizes the number of interactions required to record a workout.

### Privacy & Ownership

Workout data is stored locally on the device rather than requiring an online account.

### Progressive Overload

Previous performance is surfaced during training so users can make informed progression decisions.

### Reliability

Workout persistence uses SQLite transactions and relational constraints to protect data integrity.

### Focused UX

The interface is designed around the actual gym workflow rather than maximizing the number of features.

---

# Project Status

**Active development**

Omega is currently focused on refining workout logging, analytics, reliability, and overall mobile UX.

---

# License

MIT License

---

## Author

**Ronnie Robert**

Built as a personal engineering project to explore mobile application architecture, local data persistence, workout analytics, and production development workflows.
