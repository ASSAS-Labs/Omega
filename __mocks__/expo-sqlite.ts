/**
 * Jest manual mock for `expo-sqlite`.
 *
 * The real module needs the native Expo runtime, so unit tests replace it with
 * a genuine SQLite engine (`node:sqlite`, bundled with Node) behind the exact
 * expo-sqlite async API surface used by the app. Foreign keys, constraints, and
 * transaction rollbacks are therefore really enforced instead of simulated.
 *
 * Databases are keyed by name and held on `globalThis`, so they survive
 * `jest.resetModules()` — that lets a test simulate an app relaunch against the
 * same database file. Use `__resetDatabases()` for per-test isolation, and
 * `__executedStatements(name)` to inspect how a connection was configured
 * (e.g. the pragmas the app issues when opening it).
 */
import { DatabaseSync } from 'node:sqlite';

type BindParams = unknown[] | undefined;

const GLOBAL_KEY = '__omegaMockSqliteDatabases__';
const STATEMENT_LOG_KEY = '__omegaMockSqliteStatements__';

function registry(): Map<string, DatabaseSync> {
  const scope = globalThis as unknown as Record<string, Map<string, DatabaseSync> | undefined>;
  if (!scope[GLOBAL_KEY]) {
    scope[GLOBAL_KEY] = new Map<string, DatabaseSync>();
  }
  return scope[GLOBAL_KEY] as Map<string, DatabaseSync>;
}

/** Every `execAsync` payload per database name, in execution order. */
function statementLog(): Map<string, string[]> {
  const scope = globalThis as unknown as Record<string, Map<string, string[]> | undefined>;
  if (!scope[STATEMENT_LOG_KEY]) {
    scope[STATEMENT_LOG_KEY] = new Map<string, string[]>();
  }
  return scope[STATEMENT_LOG_KEY] as Map<string, string[]>;
}

function openRaw(name: string): DatabaseSync {
  const databases = registry();
  let db = databases.get(name);
  if (!db) {
    // Every logical database name maps to its own in-memory SQLite engine
    db = new DatabaseSync(':memory:');
    databases.set(name, db);
  }
  return db;
}

function wrap(db: DatabaseSync, name: string) {
  return {
    databaseName: 'mock',

    async execAsync(sql: string): Promise<void> {
      // Recorded before execution so tests can inspect connection setup even
      // when the statement is a no-op on this engine (e.g. `journal_mode = WAL`
      // on an in-memory database)
      statementLog().set(name, [...(statementLog().get(name) ?? []), sql]);
      db.exec(sql);
    },

    async runAsync(sql: string, params?: BindParams) {
      const result = db.prepare(sql).run(...((params ?? []) as never[]));
      return {
        changes: Number(result.changes),
        // expo-sqlite spells this `lastInsertRowId`; node:sqlite uses `lastInsertRowid`
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },

    async getFirstAsync<T>(sql: string, params?: BindParams): Promise<T | null> {
      const row = db.prepare(sql).get(...((params ?? []) as never[]));
      return (row ?? null) as T | null;
    },

    async getAllAsync<T>(sql: string, params?: BindParams): Promise<T[]> {
      return db.prepare(sql).all(...((params ?? []) as never[])) as T[];
    },

    /** Mirrors expo-sqlite: BEGIN before the task, COMMIT on success, ROLLBACK on throw. */
    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (err) {
        try {
          db.exec('ROLLBACK');
        } catch {
          // Transaction already unwound — surface the original failure below
        }
        throw err;
      }
    },

    async withExclusiveTransactionAsync(task: () => Promise<void>): Promise<void> {
      db.exec('BEGIN IMMEDIATE');
      try {
        await task();
        db.exec('COMMIT');
      } catch (err) {
        try {
          db.exec('ROLLBACK');
        } catch {
          // Ignore — the original error is rethrown
        }
        throw err;
      }
    },

    async closeAsync(): Promise<void> {
      const databases = registry();
      for (const [name, candidate] of databases.entries()) {
        if (candidate === db) databases.delete(name);
      }
      db.close();
    },
  };
}

export type MockSQLiteDatabase = ReturnType<typeof wrap>;

export async function openDatabaseAsync(name: string): Promise<MockSQLiteDatabase> {
  return wrap(openRaw(name), name);
}

export function openDatabaseSync(name: string): MockSQLiteDatabase {
  return wrap(openRaw(name), name);
}

export async function deleteDatabaseAsync(name: string): Promise<void> {
  const databases = registry();
  const db = databases.get(name);
  if (db) {
    databases.delete(name);
    db.close();
  }
}

export function deleteDatabaseSync(name: string): void {
  const databases = registry();
  const db = databases.get(name);
  if (db) {
    databases.delete(name);
    db.close();
  }
}

/** Test helper: drops every open in-memory database. */
export function __resetDatabases(): void {
  const databases = registry();
  for (const db of databases.values()) {
    try {
      db.close();
    } catch {
      // Already closed
    }
  }
  databases.clear();
  statementLog().clear();
}

/** Test helper: every statement `name` was opened with, via `execAsync`. */
export function __executedStatements(name: string): string[] {
  return statementLog().get(name) ?? [];
}

export default { openDatabaseAsync, openDatabaseSync, deleteDatabaseAsync, deleteDatabaseSync };
