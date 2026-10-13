<div align="center">
  <br />
  <img src="assets/appicon.jpg" width="168" height="168" style="border-radius: 38px; display: block; margin: 0 auto;" alt="OMEGA Icon" />
  <h1>OMEGA</h1>
  <p><strong>Local-first progressive overload tracking for Android</strong></p>
  <p>No cloud dependency. No telemetry. All training data stays in an on-device SQLite database.</p>

  <p>
    <a href="https://omega-assas4.vercel.app"><img src="https://img.shields.io/badge/Live_Showcase-omega--assas4.vercel.app-3b82f6?style=flat-square&logo=vercel&logoColor=white" alt="Live Website" /></a>
    <a href="https://github.com/ASSAS-Labs/Omega/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/ASSAS-Labs/Omega/ci.yml?branch=main&label=CI%20Pipeline&style=flat-square" alt="CI Pipeline" /></a>
    <a href="https://github.com/ASSAS-Labs/Omega/releases/latest/download/app-release.apk"><img src="https://img.shields.io/github/actions/workflow/status/ASSAS-Labs/Omega/build-apk.yml?label=Standalone%20APK&style=flat-square" alt="Build APK" /></a>
    <img src="https://img.shields.io/badge/TypeScript-Strict-3b82f6?style=flat-square" alt="TypeScript Strict" />
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-PolyForm%20Noncommercial-6b7280?style=flat-square" alt="License" /></a>
  </p>

  <p>
    <a href="https://omega-assas4.vercel.app"><strong>Explore Product Website</strong></a> &nbsp;&bull;&nbsp;
    <a href="https://github.com/ASSAS-Labs/Omega/releases/latest/download/app-release.apk"><strong>Download Latest APK</strong></a> &nbsp;&bull;&nbsp;
    <a href="#architecture--tech-stack"><strong>Architecture</strong></a> &nbsp;&bull;&nbsp;
    <a href="#quickstart--local-development"><strong>Quickstart</strong></a> &nbsp;&bull;&nbsp;
    <a href="#test-verification"><strong>Test Verification</strong></a> &nbsp;&bull;&nbsp;
    <a href="#known-architecture-decisions--limitations"><strong>Decisions &amp; Limitations</strong></a>
  </p>
</div>

---

## Overview

**OMEGA** is a local-first strength training and progressive overload tracker for Android. Training history lives entirely on-device in an embedded SQLite database configured with Write-Ahead Logging. There are no remote backends, no account logins, and no network access in the app's data path.

- **On-device relational storage**: training history, routine splits, and custom exercises persist in SQLite (`gym_tracker.db`), written in multi-set transactions.
- **Crash-recovery drafts**: an in-progress session serializes to `@active_workout_draft` (AsyncStorage) and is offered for resume on cold start.
- **Progressive overload analytics**: Epley estimated-1RM curves, Monday-first compliance calendars, and split-aware streaks.
- **Background rest timer**: Notifee-powered Android notification channel for the rest countdown, with an exact-alarm permission fallback.
- **Data portability**: full JSON export and import of every table.

An interactive web overview is available at [omega-assas4.vercel.app](https://omega-assas4.vercel.app).

<details>
<summary><strong>View Mobile Application Screenshots</strong></summary>

<br />

| 01 · Dashboard & Streak Matrix | 02 · Active Workout Builder | 03 · Movement Catalog |
|:---:|:---:|:---:|
| <img src="assets/screenshots/01_dashboard.png" width="220" style="border-radius: 16px;" alt="Dashboard" /> | <img src="assets/screenshots/02_workout.png" width="220" style="border-radius: 16px;" alt="Workout" /> | <img src="assets/screenshots/03_exercises.png" width="220" style="border-radius: 16px;" alt="Exercises" /> |

| 04 · Progression Analytics | 05 · Routine Split Setup | 06 · Settings & Export |
|:---:|:---:|:---:|
| <img src="assets/screenshots/04_analytics.png" width="220" style="border-radius: 16px;" alt="Analytics" /> | <img src="assets/screenshots/06_split.png" width="220" style="border-radius: 16px;" alt="Split" /> | <img src="assets/screenshots/05_settings.png" width="220" style="border-radius: 16px;" alt="Settings" /> |

</details>

---

## Architecture & Tech Stack

### Architecture Highlights

- **Thread-Safe Single Persistent Database Connection**: a centralized manager in `src/services/database.ts` caches the initialization `Promise<SQLiteDatabase>` before its first `await`, so concurrent screen mounts await one in-flight open instead of racing the native file handle. The React Native JS runtime is single-threaded — the SQLite connection is the serialization point, and writes are ACID transactions on it.
- **React Native 0.81 New Architecture (Fabric & TurboModules/JSI)**: animations and gesture handling run as Reanimated UI-thread worklets rather than through legacy bridge round-trips.
- **Shopify FlashList 2.0**: cell recycling for the movement catalog and session lists.
- **Reanimated 4.1**: worklet-driven `transform` / `opacity` animations that stay off the JS thread.

### Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Runtime** | React Native 0.81 / Expo SDK 54 | New Architecture (Fabric & TurboModules/JSI) |
| **Language** | TypeScript 5.9 | `strict: true`; `tsc --noEmit` is part of CI |
| **Relational storage** | `expo-sqlite` 16.0 | Embedded SQLite, `PRAGMA journal_mode = WAL`, foreign keys enforced |
| **Draft persistence** | `@react-native-async-storage/async-storage` 2.2 | Ephemeral JSON session draft (`@active_workout_draft`) |
| **State management** | Zustand 5.0 | UI state slices for the active session and timer |
| **List recycling** | Shopify FlashList 2.0 | Recycled list views |
| **Motion** | React Native Reanimated 4.1 | UI-thread worklets |
| **Background alerts** | Notifee 9.1 | Android notification channel & exact alarms |
| **Test harness** | Jest 30 / `jest-expo` 57 | Real SQLite engine (`node:sqlite`) instead of a mocked driver |

The persistence layer, migration policy, and concurrency model are documented in [docs/architecture.md](docs/architecture.md).

---

## Quickstart & Local Development

### Prerequisites

- **Node.js `>= 22.12.0` (Node 24 recommended)** — required for `DatabaseSync` in `node:sqlite`, which the Jest harness uses. Enforced by `engines` in `package.json` and used in CI / the APK build workflow.
- **npm `>= 9.0.0`**
- **Android SDK (API 26+)** with an emulator or a connected device.

> **Notifee is not available in standard Expo Go.** `@notifee/react-native` ships custom native Android code, so any build that shows the rest-timer notification — and therefore any realistic local test — needs a development build, not Expo Go.

```bash
npm install --legacy-peer-deps
npx expo run:android
```

### Building a standalone release APK locally

```bash
# Generate the native Android project
npx expo prebuild --platform android --clean

# Assemble the release APK
cd android && ./gradlew assembleRelease --no-daemon
```

The artifact is written to `android/app/build/outputs/apk/release/app-release.apk`.

`app.json` holds `version` and `android.versionCode`; bump the `versionCode` for every release so the APK installs as an update over an existing installation instead of being rejected as a downgrade.

---

## Test Verification

Tests run against a real database engine: the Jest harness binds the `expo-sqlite` calls used by the app to Node's built-in `DatabaseSync` (`node:sqlite`), so foreign-key enforcement, cascades, and transaction rollbacks are the genuine SQLite behaviours rather than stubs.

```bash
npx tsc --noEmit                     # 0 compiler errors
npm test -- --ci --watchAll=false    # all suites green
```

### Test Summary

| Test Domain | Suites | Tests | What it validates |
|---|:---:|:---:|---|
| **Domain Mathematics** | 1 | 20 | Epley 1RM curve, zero/negative bounds, KG/LBS precision |
| **Analytics & Bucketing** | 1 | 33 | Weekly/monthly aggregation, chart headroom geometry |
| **Streak Engine** | 1 | 45 | Monday-first alignment, split-aware rest-day tolerance |
| **Drag Reordering** | 1 | 16 | Midpoint swap thresholds, boundary hysteresis |
| **SQLite Schema & ACID** | 3 | 81 | Migrations (`user_version`), indexes, soft-delete archival & re-activation, idempotent saves via session token, blank set stripping, multi-session logs, rollback on error, backup round-trips, fixtures |
| **Crash Recovery Drafts** | 1 | 19 | Draft serialization, session token persistence, deep payload validation, expiry, generation-guarded discard of trailing debounced saves |
| **Background Timers** | 1 | 16 | Android notification channels, exact-alarm fallback |
| **State & UI Integration** | 7 | 83 | Screen mount lifecycles, store reactivity, interaction flows, modal lifecycles |
| **Total** | **16** | **313** | **0 failures** |

> Per-suite scope — including what each database test asserts about the schema and migration policy — is in [docs/architecture.md](docs/architecture.md). Run the commands above for the live counts.

---

## Known Architecture Decisions & Limitations

- **Local-first trade-off**: all data lives exclusively in local SQLite. Device loss, or uninstallation without an exported JSON backup, results in permanent data loss. Cloud synchronization is not currently implemented.

- **Binary target**: release APKs are built for `arm64-v8a` to keep the download compact. Desktop x86/x86_64 emulators cannot install that artifact — build locally with `npx expo run:android` instead.

- **Soft-deletion strategy**: deleting an exercise from the catalog sets `is_archived = 1` rather than removing the row. Archived exercises disappear from the catalog and from routine setup, while every logged set, volume aggregation, and 1RM calculation keeps reading them, so historical charts survive the deletion. Active exercise names are unique via partial index `idx_exercises_active_name`; re-creating an exercise with an archived exercise's name seamlessly re-activates it (`is_archived = 0`).

- **Dual-storage split & Idempotent Crash Recovery**: durable training data lives in `gym_tracker.db`; the in-progress session lives in AsyncStorage under `@active_workout_draft`. Sessions carry a pre-allocated `logId` token that upserts idempotently into SQLite (`INSERT ... ON CONFLICT(id) DO UPDATE ...`), preventing double-counted training volume on crash recovery retries. Debounce timers are cancelled upon finish, and trailing writes are generation-guarded.

- **Roadmap**: encrypted local backup files, optional end-to-end encrypted device sync, a Wear OS companion, and an RPE / warm-up set calculator. None of these are implemented.

---

## License

This software is released under the **PolyForm Noncommercial License 1.0.0**.

You are free to inspect the source code, fork the repository, and modify the application for personal and non-commercial educational use. Refer to the [LICENSE](LICENSE) file for complete terms.
