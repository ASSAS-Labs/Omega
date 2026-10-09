<p align="center">
  <img src="assets/omega_hero.jpg" width="100%" alt="Omega — Progressive Overload Tracking" />
</p>

<p align="center">
  <img src="assets/appicon.jpg" width="96" height="96" style="border-radius: 22px;" alt="Omega" />
</p>

<h1 align="center">OMEGA</h1>

<p align="center">
  <strong>Progressive overload tracking that stays on your device.</strong>
</p>

<p align="center">
  <a href="https://github.com/ASSAS-Labs/Omega/actions/workflows/ci.yml"><img src="https://github.com/ASSAS-Labs/Omega/actions/workflows/ci.yml/badge.svg" alt="CI Pipeline" /></a>
  <a href="https://github.com/ASSAS-Labs/Omega/actions/workflows/build-apk.yml"><img src="https://github.com/ASSAS-Labs/Omega/actions/workflows/build-apk.yml/badge.svg" alt="Build APK" /></a>
  <img src="https://img.shields.io/badge/tests-290%20passed-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/typescript-strict-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue" alt="License" />
</p>

---

Omega is a local-first workout tracker and progressive overload manager for Android. It stores everything on-device in SQLite — no accounts, no cloud sync, no telemetry. You own your training data, period.

Build custom routines around any split (PPL, Upper/Lower, Arnold, Bro, or fully custom), log sets with previous-session benchmarks visible in real time, and track strength progression through estimated 1RM curves and volume analytics.

---

## What It Does

<p align="center">
  <img src="assets/screenshots/01_dashboard.png" width="130" alt="Dashboard"/>
  &nbsp;
  <img src="assets/screenshots/02_workout.png" width="130" alt="Workout"/>
  &nbsp;
  <img src="assets/screenshots/03_exercises.png" width="130" alt="Exercise Library"/>
  &nbsp;
  <img src="assets/screenshots/04_analytics.png" width="130" alt="Analytics"/>
  &nbsp;
  <img src="assets/screenshots/05_settings.png" width="130" alt="Settings"/>
  &nbsp;
  <img src="assets/screenshots/06_split.png" width="130" alt="Routine Split"/>
  &nbsp;
  <img src="assets/screenshots/07_streaks.png" width="130" alt="Top Streaks"/>
</p>

| Screen | What you see |
|---|---|
| **Dashboard** | Full-month compliance calendar with per-day status markers, today's routine card, streak badge with tap-to-view all-time streak history, and one-tap session launch |
| **Workout** | Drag-to-reorder routine builder, previous-session benchmarks loaded per exercise, live set logging with weight/reps input and completion tracking |
| **Exercises** | Searchable movement catalog organized by muscle group, support for custom exercises that integrate across all screens |
| **Analytics** | Estimated 1RM progression charts, total volume trends, session/week/month granularity toggle, peak-benchmark aggregation, 4-week trend comparison |
| **Settings** | KG/LBS unit toggle, configurable rest timer with background notifications and haptic alerts, full JSON database export and import for portability |
| **Routine Split** | Per-day muscle group target assignment (Mon–Sun) with multi-group selection, real-time assignment badges, and automatic sync to workout builder |
| **Streak History** | Top 5 unbroken training streaks leaderboard, current active streak counter, and split-aware streak persistence rules |

---

## Key Capabilities

### Local-First Storage
All data lives in an embedded SQLite database on the device. WAL journaling, foreign-key cascades, busy timeouts, and a singleton connection guard protect against concurrency issues. The schema is versioned with `PRAGMA user_version` migrations. No network calls are made — ever.

### Crash-Resilient Sessions
Active workout state is continuously persisted to a local draft. If the app is killed mid-session, a recovery banner appears on next launch to resume exactly where you left off. Completing a session writes all sets in a single atomic transaction before clearing the draft.

### Progression Analytics
The analytics engine buckets logged data by session, ISO week, or calendar month. Charts render estimated 1RM curves (Epley formula) and total volume trends with dynamic headroom calculations so data points never clip the chart boundary. Stacked two-line date labels keep dense timelines readable.

### Workout Rest Timer
An interactive minute/second picker feeds directly into the rest timer. Countdown notifications are delivered via Notifee even when the app is backgrounded. On Android 13+, exact-alarm permissions are probed and gracefully degraded. Timer completion triggers native haptic feedback.

### Compliance Tracking
The dashboard renders a Monday-first monthly calendar grid where each day carries a distinct status marker — logged, missed (scheduled but untrained), upcoming, or rest day. Streak calculations respect the configured split: rest days neither extend nor break a streak.

### Data Portability
The entire database serializes to a human-readable JSON file via the native share sheet. Importing validates schema structure and restores everything inside an atomic database operation. Backup files produced on one device restore cleanly on another.

### Performance
Exercise catalogs and selection pools use FlashList 2.x cell recycling. Press animations run on the UI thread via Reanimated worklets — only composite properties (scale, opacity) are animated, so no layout reflows occur. Modal transitions are spring-driven with decoupled mount/visibility lifecycles.

---

## Architecture

```text
Omega/
  src/
    components/        Reusable UI (RestTimerModal, StreakHistoryModal, DragHandle, PressFeedback)
    constants/         Static exercise catalog
    hooks/             Custom hooks (useTimeSync, useWeightUnit)
    screens/           Dashboard, Workout, Exercises, Analytics, Settings, SplitSetup
    services/          SQLite database, backup, notifications, draft persistence, preferences
    store/             Zustand global state
    theme/             Color palette, layout tokens, motion constants
    types/             TypeScript interfaces
    utils/             Domain math, analytics aggregation, date calculations, drag geometry
  __mocks__/           Jest manual mocks (real SQLite engine, in-memory FS/storage)
  plugins/             Expo config plugins (debug symbol stripping)
  assets/              App icon, screenshots, generated images
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | React Native 0.81 / Expo SDK 54 | Cross-platform mobile foundation |
| **Language** | TypeScript 5.9 (strict) | Static type safety |
| **Database** | expo-sqlite 16.0 | Embedded relational storage |
| **State** | Zustand 5.0 | Global in-memory UI state |
| **Navigation** | React Navigation 7.x | Bottom tabs + native stack routing |
| **Charts** | react-native-gifted-charts 1.4 | Progression line charts |
| **Notifications** | Notifee 9.1 | Background alarm scheduling |
| **Animation** | Reanimated 4.1 | UI-thread worklet animations |
| **Lists** | FlashList 2.0 | Virtualized cell-recycling catalogs |
| **Testing** | Jest 30 / jest-expo 57 | 290 automated tests across 16 suites |
| **CI/CD** | GitHub Actions | Typecheck, test, and APK build pipelines |

---

## Quality Assurance

Every commit triggers a CI pipeline that enforces three quality gates before merge:

1. **TypeScript strict compilation** — zero errors across all source files
2. **290 automated tests** spanning domain math, service integration (real SQLite), and rendered UI assertions
3. **Coverage targets** — core utilities at 100% statement coverage, services at 90%+

The test suite exercises the real schema on Node's built-in SQLite engine (`node:sqlite`), so foreign keys, cascades, and transaction rollbacks are genuinely enforced during every run — not mocked away.

### What the tests verify

- 1RM Epley formula accuracy, edge cases, and NaN guards
- Volume aggregation with malformed input sanitization
- KG/LBS conversion round-trip parity
- Split-aware streak math (rest days, missed days, same-day deduplication)
- Analytics bucketing (session, ISO week, month) with chart headroom calculations
- Drag-reorder midpoint swap geometry with boundary hysteresis
- Month compliance calendar grid generation and marker state logic
- Schema versioning, migration idempotency, and cascade enforcement
- Crash-recovery draft save/retrieve round-trip and concurrent hydration
- Backup export/import schema parity and rollback on invalid payloads
- Android 13+ exact-alarm permission probing and fallback paths
- Full screen integration tests for Dashboard, Analytics, streak sheet, and rest timer picker

---

## Build Pipeline

### CI (Automated on every push and PR)

```
Commit / Pull Request
       |
       v
  GitHub Actions
       |
       +-- npm ci --legacy-peer-deps
       +-- npx tsc --noEmit
       +-- npm test -- --ci --watchAll=false
       |
       v
  Quality gate passed
```

### Android APK (On-demand via workflow dispatch or release tags)

The `build-apk` workflow compiles a standalone `.apk` directly on GitHub Actions runners, bypassing EAS cloud queues entirely. It runs the same quality gates first, then generates the native Android project via Expo Prebuild and builds a release APK through Gradle.

The compiled APK is uploaded as a downloadable CI artifact (`omega-arm64-release-apk`) with 7-day retention.

```
Manual dispatch / Release tag (v*)
       |
       v
  Quality gates (typecheck + tests)
       |
       v
  npx expo prebuild --platform android --clean
       |
       v
  ./gradlew assembleRelease --no-daemon
       |
       v
  Upload artifact: omega-arm64-release-apk
```

To trigger a build: navigate to **Actions** > **Build Android APK** > **Run workflow**.

---

## Getting Started

### Prerequisites

- Node.js 22.13+ (service tests use `node:sqlite`)
- npm 9+
- Expo Go or an Android emulator

### Install and run

```bash
git clone https://github.com/ASSAS-Labs/Omega.git
cd Omega
npm install
npm run start
```

Press `a` to open on Android, `i` for iOS simulator, or scan the QR code with Expo Go.

### Run tests

```bash
npx tsc --noEmit
npm test -- --coverage
```

### Build an APK locally

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

Or push a release tag to trigger the GitHub Actions APK build workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Debug seed data

Development builds populate a fresh database with 52 weeks of training history on first launch (~230 sessions, ~3,300 sets across a five-day split). The seed is deterministic, stops at yesterday, and is automatically purged from release builds. Real user data is never overwritten.

---

## Build Optimization

The release APK is configured for minimal size and maximum performance:

- **ABI filtering**: Only `arm64-v8a` binaries are included, stripping 32-bit and emulator architectures
- **R8 minification**: Dead code elimination via `enableMinifyInReleaseBuilds`
- **Resource shrinking**: Unreferenced resources removed via `enableShrinkResourcesInReleaseBuilds`
- **ProGuard keep rules**: SQLite JSI bindings and Reanimated worklet classes are preserved through explicit keep rules
- **Debug symbol stripping**: Native `.so` files ship without debug symbols via a local config plugin

---

## License

This project is licensed under the **PolyForm Noncommercial License 1.0.0**. You may view, clone, fork, and contribute for personal and educational purposes. Commercial use, sales, and monetized distribution are prohibited. See the [LICENSE](LICENSE) file for full terms.
