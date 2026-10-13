# OMEGA Architecture & Technical Reference

This document covers OMEGA's system architecture, persistence layer, concurrency model, testing methodology, and build pipelines. It expands on the summary in [README.md](../README.md).

---

## 1. System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                  OMEGA CLIENT                                     |
+-----------------------------------------------------------------------------------+
|  PRESENTATION LAYER (React Native 0.81 + React Navigation 7)                      |
|    - DashboardScreen      - ActiveWorkoutScreen      - AnalyticsScreen            |
|    - ExercisesScreen      - SplitSetupScreen         - SettingsScreen             |
|    - RestTimerModal       - StreakHistoryModal       - WorkoutDraftBanner         |
+-----------------------------------------------------------------------------------+
|  STATE & MOTION MANAGEMENT                                                        |
|    - Zustand UI Store (Active Session, Timer Cadence, Selected Split)             |
|    - Reanimated 4.1 UI-Thread Worklets (60 FPS Gestures & Press Feedback)         |
|    - FlashList 2.0 Virtual Cell Recycling                                         |
+-----------------------------------------------------------------------------------+
|  DOMAIN SERVICES & UTILITIES                                                      |
|    - Epley 1RM Engine     - Split-Aware Streaks      - Drag-Reorder Geometry      |
|    - WorkoutDraftService  - BackupSerializer         - NotifeeTimerService        |
+-----------------------------------------------------------------------------------+
|  PERSISTENCE LAYER (Embedded On-Device Relational SQLite)                         |
|    - PRAGMA journal_mode = WAL                       - PRAGMA foreign_keys = ON   |
|    - Versioned Migrations (user_version)             - Atomic Multi-Set Commits   |
|    - Zero Cloud Telemetry                            - Zero Outbound Network I/O  |
+-----------------------------------------------------------------------------------+
```

### Module Organization

```text
Omega/
├── .github/workflows/
│   ├── ci.yml                 # Strict typecheck and node:sqlite test validation
│   └── build-apk.yml          # Headless Gradle release APK compiler
├── assets/                    # Application icons, vector assets, and screenshots
├── docs/
│   └── architecture.md        # This document
├── src/
│   ├── components/            # Reusable UI components (Modals, Banners, Feedback)
│   ├── constants/             # Standard movement definitions and muscle categories
│   ├── hooks/                 # Custom hooks (useTimeSync, useWeightUnit)
│   ├── screens/               # Screen view controllers
│   ├── services/              # SQLite connection, drafts, timer, backup services
│   ├── store/                 # Zustand application state slices
│   ├── theme/                 # Design tokens, color palette, typography
│   ├── types/                 # TypeScript schemas and contracts
│   └── utils/                 # Domain math (Epley 1RM), date bucketing, drag geometry
└── __mocks__/                 # Real Node.js SQLite harness (`node:sqlite`) for Jest
```

---

## 2. Persistence Layer & Concurrency Model

### Thread-Safe Single Persistent Database Connection (`src/services/database.ts`)

OMEGA uses `expo-sqlite` (v16) backed by JSI C bindings.

The React Native JavaScript runtime executes on a single thread, so there is no JS-side data race to guard against. What does need guarding is the native **file handle**: each `openDatabaseAsync` call builds a fresh `NativeDatabase`, and parallel opens of the same file contend for its lock and fail with `SQLITE_BUSY`. OMEGA therefore caches a single connection promise:

- The initialization `Promise<SQLiteDatabase>` is assigned before its first `await`, so callers that arrive mid-initialization (`Dashboard`, `Analytics`, `useAppStore` all fire on mount) await the identical in-flight open instead of starting competing ones.
- A failed initialization clears the cache, so one transient open or schema failure cannot hand a rejected promise to every later caller for the rest of the process lifetime.
- Connection-scoped PRAGMAs are applied on every open:
  ```sql
  PRAGMA busy_timeout = 5000;
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  ```
  All three are connection settings rather than file properties (only the WAL mode is remembered in the file), so without re-applying them a fresh launch would run with SQLite's defaults and lose a read/write race to `SQLITE_BUSY`.
- SQLite's single-writer model is what serializes writes; each multi-row save runs inside a transaction (`withTransactionAsync`), so a failed write leaves no partial session behind.

### Schema versioning and migration policy

- `SCHEMA_VERSION` is stamped into `PRAGMA user_version`. Installing the app over an older database runs the version-gated migrations in `initSchema` in order; a fresh install builds the current base schema directly.
- **Version 1 → 2** added `exercises.is_archived` (soft deletion) and the relational indexes. `ALTER TABLE ... ADD COLUMN` cannot run inside a transaction in SQLite, so this migration is a guarded schema probe rather than a transaction body.
- Pre-versioning databases (no `user_version`, old `exercises` shape) run the idempotent repair path first: the legacy table is replaced, then `workout_sets` and `day_templates` are rebuilt whenever their foreign keys do not point at the live `exercises` table.
- Migration blocks run through `runSchemaRepair`, which rolls back on failure, re-asserts `foreign_keys = ON`, and retires the connection so the next `getDB()` opens a clean handle. A leaked transaction or a connection left with foreign keys disabled is what turns one failed migration into `SQLITE_BUSY` on every later query.
- Index creation is idempotent (`CREATE INDEX IF NOT EXISTS`) and runs on every launch, so a launch that stopped between the version stamp and the index creation finishes the job on the next start.

### Indexes

| Index | Serves |
|---|---|
| `idx_workout_sets_log_id` | Cascade from `workout_logs` and per-session set reads |
| `idx_workout_sets_exercise_id` | Analytics joins, "last time" lookup, 1RM ranking |
| `idx_workout_logs_date` | Per-date session reads, streak and compliance windows |
| `idx_exercises_archived` | Catalog and routine queries filtering out archived exercises |

---

## 3. Data Model Decisions

### Soft deletion of exercises

Deleting an exercise from the catalog sets `is_archived = 1`. It is never a SQL `DELETE`.

A hard delete cascaded through `ON DELETE CASCADE` into `workout_sets` and `day_templates`, which erased the logged history of every session that used the movement while the parent `workout_logs` row survived — so the day still counted toward streaks and compliance, but its sets vanished from volume graphs and 1RM charts. Archiving keeps the history readable:

- Catalog reads (`getAllExercises`, `getExercisesByMuscleGroup`), the routine view (`getDayTemplate`), routine writes (`saveDayTemplate`) and routine counts all filter on `is_archived = 0`.
- Logged history is never filtered: `getExerciseProgress`, `getExerciseBestSet`, `getPreviousExerciseSets` and `getExerciseVolumeTrend` read every set regardless of the archive flag.
- `getTrackedExercises` keeps an archived exercise only while it carries logged history, so the analytics picker can still chart a movement that was trained.
- Active exercise names are enforced unique via partial index `idx_exercises_active_name ON exercises(name COLLATE NOCASE) WHERE is_archived = 0`. Re-creating an exercise matching an archived exercise's name seamlessly re-activates it (`UPDATE exercises SET is_archived = 0, muscleGroup = ? WHERE id = ?`) rather than throwing a duplicate constraint collision.

### Multiple sessions per day

`workout_logs` accepts any number of sessions for one `date`. `saveWorkoutLog` inserts a new row per save, and the previous implementation's `DELETE FROM workout_logs WHERE date = ?` is gone — it silently destroyed an earlier session on the same day (morning and evening, or a second attempt at a failed day).

- **Reading a day** resolves to the newest session for that date (`ORDER BY date DESC, id DESC LIMIT 1`). Row ids are monotonic per process (`createId` appends an incrementing counter before the random suffix), so two sessions written in the same millisecond still order deterministically.
- **Editing** is by primary key: `saveWorkoutLog(..., logId)` replaces exactly that row and its sets. The workout screen loads the day's session and passes its id back.
- **Deleting a day** removes only the newest session, the same row the dashboard displayed.
- Streaks and compliance counts are per distinct date, so several sessions on one day still count once.

### Epley formula parity

`estimateOneRepMax` in `src/utils/calculations.ts` is the single definition of the estimate: `weight > 0`, `reps > 0`, `reps === 1` → the weight itself, otherwise `weight * (1 + reps / 30)` rounded to two decimals. `EPLEY_ONE_REP_MAX_SQL` exports the same expression for SQL ranking, and `getExerciseBestSet` uses it both to select the best set and to return its `e1rm`, so the query and the TypeScript function cannot disagree about which set is best or about what its estimate is.

### Volume trend windows

`getExerciseVolumeTrend` compares two equal 28-day calendar windows: `[today - 27, today]` against `[today - 55, today - 28]`, with `>= priorCutoff` applied in SQL so older history is filtered before grouping instead of being aggregated into a bucket that is then discarded. A single `today - 28` cutoff used to put 29 days in the recent bucket and 28 in the prior one, inflating recent volume by roughly 3.5%.

### Set validation

`saveWorkoutLog` validates every set before opening its write transaction:

- `InvalidSetError` — missing exercise id, non-finite or negative weight, or a rep count that is not a positive integer. The app's logging screen filters zero-rep rows before saving, so zero reps reaching the service is a programming error rather than an isometric hold.
- `UnknownExerciseError` — the set references an exercise id the library does not contain.

Both are thrown rather than swallowed. The previous implementation skipped invalid and unresolvable sets silently and still returned a successful log id, so a caller could not distinguish a complete save from one that stored no sets at all.

---

## 4. Dual-Storage Engine

OMEGA deliberately splits durable relational storage from ephemeral session state:

| Engine | Storage Medium | Lifecycle & Usage | Rationale |
|---|---|---|---|
| **Relational Data Engine** | `gym_tracker.db` (SQLite via `expo-sqlite`) | Long-term training history, workout logs, completed sets, routine splits, exercises, and PRs. | Needs ACID guarantees, indexed lookups, joins across sessions, and historical aggregation. |
| **Ephemeral Session Drafts** | `@active_workout_draft` (AsyncStorage) | Debounced snapshot of an in-progress logging session. | Survives an OS process kill without writing uncommitted partial records into the relational tables. |

### Draft lifecycle (`src/services/workoutDraftService.ts`)

- Every stored draft carries `version` and `updatedAt`. A draft older than 24 hours is expired on read: it is cleared and reported as absent, so the UI never offers to resume an abandoned session.
- Reads validate the payload field by field (exercise entries, `previousSets`, set rows) instead of casting to the type. A payload that fails validation is cleared rather than hydrated, because a draft written by an older build would otherwise crash the screen on the first access of a missing field.
- Saving and clearing share one serialized queue, and `clearWorkoutDraft` bumps a generation counter. A save that was requested before the discard captures the older generation and skips itself, so a debounced auto-save cannot resurrect a draft the user just finished. Reads wait for the queue, so a read issued after a discard never observes the discarded payload.
- Storage failures propagate to the caller: a draft that could not be written is precisely what the caller needs to know, and `ActiveWorkoutScreen` reports it instead of silently continuing.

---

## 5. Test Verification Matrix

Every test runs in Jest 30 against `node:sqlite` (Node's built-in `DatabaseSync`), executing genuine SQL statements with real constraint enforcement rather than an in-memory fake of SQLite.

- **Test suites**: 16
- **Tests**: 313, all passing (`npm test -- --ci --watchAll=false`)
- **Static analysis**: TypeScript 5.9 `strict: true`, 0 diagnostics (`npx tsc --noEmit`)

| Category | Suite File | Tests | Scope |
|---|---|:---:|---|
| **Relational Schema & Migrations** | `database.test.ts` | 48 | Base schema, indexes, WAL/busy-timeout/foreign-key configuration, version stamping, v1→v2 soft-delete migration, pre-versioning repair, FK enforcement, exercise archival & re-activation, idempotent saves via session token, blank set stripping, per-date multi-session reads and writes, transaction rollback, analytics queries |
| **Seed & Diagnostics** | `debugSeed.test.ts` | 14 | Deterministic fixture generation, consistency with the analytics queries, purge routine |
| **Data Portability** | `backupService.test.ts` | 19 | Full-table JSON export, archive flag round-trip, import validation, v1 backup restore without archive flag, rollback on malformed payloads |
| **Crash Recovery Drafts** | `workoutDraftService.test.ts` | 19 | Serialization round-trip, version/`updatedAt` stamping, session token persistence, deep payload validation, 24-hour expiry, generation-guarded discard of trailing debounced saves, failure propagation |
| **Domain Mathematics** | `calculations.test.ts` | 20 | Epley 1RM boundaries, KG/LBS conversion precision |
| **Analytics Bucketing** | `analyticsCalculations.test.ts` | 33 | Session/week/month bucketing, chart headroom geometry |
| **Streak Engine** | `dateUtils.test.ts` | 45 | Monday-first alignment, split-aware rest-day forgiveness, missed-day penalties |
| **Drag Geometry** | `dragReorder.test.ts` | 16 | Midpoint swap thresholds, boundary hysteresis, permutation stability |
| **Background Timers** | `notifeeTimerService.test.ts` | 16 | Notification channel setup, exact-alarm degradation |
| **State Management** | `useAppStore.test.ts` | 3 | Store actions, write/read ordering |
| **Screens & Modals** | `DashboardScreen.test.tsx`, `ActiveWorkoutScreen.test.tsx`, `AnalyticsScreen.test.tsx`, `StreakHistoryModal.test.tsx`, `RestTimerModal.test.tsx`, `App.test.tsx` | 80 | Mount lifecycles, data binding, draft recovery banner, interaction flows, modal lifecycles |

---

## 6. Automated CI/CD & Build Pipelines

### Continuous Integration (`.github/workflows/ci.yml`)

Runs on pushes and pull requests targeting `main`:

1. Checks out the repository on `ubuntu-latest`.
2. Configures Node.js `24` for unflagged `node:sqlite` `DatabaseSync` support.
3. Installs dependencies with `npm ci --legacy-peer-deps`.
4. Runs `npx tsc --noEmit`.
5. Runs `npm test -- --ci --watchAll=false`.

### Standalone APK Compilation (`.github/workflows/build-apk.yml`)

Headless Android build, no cloud build queue:

1. Configures Java 17 (Temurin) and Node.js `22.12.0`.
2. Runs `npx expo prebuild --platform android --clean`.
3. Runs `./gradlew assembleRelease --no-daemon`.
4. Produces a standalone APK stripped to `arm64-v8a` (~19.6 MB).
5. Publishes release artifacts on version tags (`v*`).

The APK's `versionCode` comes from `app.json`, and `eas.json` sets `appVersionSource: "local"` so EAS builds do not resolve it from remote state — the number that decides whether an install is an update is the committed one.

---

## 7. Binary Optimization

- **Architecture target**: `arm64-v8a` only (`buildArchs`), dropping 32-bit `armeabi-v7a` and desktop `x86_64` binaries. The resulting APK does not install on x86/x86_64 emulators; build locally with `npx expo run:android` for those.
- **R8 / ProGuard**: code shrinking and obfuscation (`enableMinifyInReleaseBuilds`) with an explicit keep rule for `expo.modules.sqlite`, whose JSI bindings are resolved by name from native code.
- **Resource stripping**: unused drawables and layouts are stripped during release compilation.
