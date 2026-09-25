/**
 * Jest manual mock for `@react-native-async-storage/async-storage`.
 *
 * Provides an in-memory key/value store plus a `__hooks.beforeRemove` hook that
 * lets tests simulate a debounced write landing between a delete and its
 * verification read (used to prove atomic draft discard).
 */
const store = new Map<string, string>();

export const __hooks: {
  beforeRemove: ((key: string) => void) | null;
} = {
  beforeRemove: null,
};

const AsyncStorage = {
  getItem: jest.fn(async (key: string) => (store.has(key) ? (store.get(key) as string) : null)),

  setItem: jest.fn(async (key: string, value: string) => {
    store.set(key, String(value));
  }),

  removeItem: jest.fn(async (key: string) => {
    store.delete(key);
    __hooks.beforeRemove?.(key);
  }),

  mergeItem: jest.fn(async (key: string, value: string) => {
    const existing = store.get(key);
    if (!existing) {
      store.set(key, String(value));
      return;
    }
    store.set(key, JSON.stringify({ ...JSON.parse(existing), ...JSON.parse(String(value)) }));
  }),

  clear: jest.fn(async () => {
    store.clear();
  }),

  getAllKeys: jest.fn(async () => Array.from(store.keys())),

  multiGet: jest.fn(async (keys: string[]) =>
    keys.map((key) => [key, store.has(key) ? (store.get(key) as string) : null])
  ),

  multiSet: jest.fn(async (pairs: [string, string][]) => {
    for (const [key, value] of pairs) store.set(key, String(value));
  }),

  multiRemove: jest.fn(async (keys: string[]) => {
    for (const key of keys) store.delete(key);
  }),
};

/** Test helper: empties the store and detaches any interleaving hook. */
export function __resetAsyncStorage(): void {
  store.clear();
  __hooks.beforeRemove = null;
}

/** Test helper: direct store access (bypasses the async API). */
export function __getStore(): Map<string, string> {
  return store;
}

export default AsyncStorage;
