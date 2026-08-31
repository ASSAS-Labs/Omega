import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@default_rest_timer';
const DEFAULT_DURATION_MS = 60000; // 60s

export async function getDefaultRestDurationMs(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_DURATION_MS;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_DURATION_MS;
  } catch (err) {
    console.warn('Failed to read rest timer preference:', err);
    return DEFAULT_DURATION_MS;
  }
}

export async function setDefaultRestDurationMs(durationMs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(durationMs));
  } catch (err) {
    console.warn('Failed to save rest timer preference:', err);
  }
}

/**
 * Formats a duration (ms) for display, e.g. 120000 -> "2 min 00 sec",
 * 90000 -> "1 min 30 sec".
 */
export function formatRestDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes} min ${seconds.toString().padStart(2, '0')} sec`;
}
