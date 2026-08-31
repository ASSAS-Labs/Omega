import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@weight_unit';
const DEFAULT_UNIT = 'kg';

export type WeightUnit = 'kg' | 'lbs';

const KG_PER_LB = 0.45359237; // 1 lb = 0.45359237 kg

// In-memory cached unit so screens can read it synchronously and react to
// changes via useSyncExternalStore without a full app restart.
let currentUnit: WeightUnit = DEFAULT_UNIT;
const listeners = new Set<(unit: WeightUnit) => void>();

/** Reads the persisted unit preference into the in-memory cache. */
export async function loadWeightUnit(): Promise<WeightUnit> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    currentUnit = raw === 'lbs' ? 'lbs' : DEFAULT_UNIT;
  } catch (err) {
    console.warn('Failed to read weight unit preference:', err);
    currentUnit = DEFAULT_UNIT;
  }
  return currentUnit;
}

/** Persists the unit preference and notifies all subscribers immediately. */
export async function saveWeightUnit(unit: WeightUnit): Promise<void> {
  currentUnit = unit;
  listeners.forEach((fn) => fn(unit));
  try {
    await AsyncStorage.setItem(KEY, unit);
  } catch (err) {
    console.warn('Failed to save weight unit preference:', err);
  }
}

/** True only when the user has explicitly chosen a unit before (first-launch check). */
export async function hasStoredWeightUnit(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) !== null;
  } catch (err) {
    // If storage is unavailable, assume a unit was chosen to avoid nagging.
    return true;
  }
}

/** Synchronous read of the currently active unit (for hooks). */
export function getWeightUnitSync(): WeightUnit {
  return currentUnit;
}

/** Subscribe to unit changes; returns an unsubscribe function. */
export function subscribeWeightUnit(fn: (unit: WeightUnit) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ---------------- Conversion helpers (DB stores canonical kg) ----------------

export {
  KG_PER_LB,
  LBS_PER_KG,
  lbsToKg,
  kgToLbs,
  convertWeight,
  toKg,
  roundWeight,
  formatWeight,
} from '../utils/calculations';
