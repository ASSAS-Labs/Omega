import { Vibration, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Triggers a device alert when the rest countdown reaches zero.
 *
 * Android: a distinct 3-pulse vibration pattern
 * (wait 0ms, vibrate 400ms, wait 200ms, vibrate 400ms).
 * iOS: a single success haptic via expo-haptics.
 *
 * Safe in Expo Go: uses only local Vibration / Haptics APIs — no remote
 * push notification tokens are touched here.
 */
export async function triggerRestTimerFinishedAlert() {
  try {
    if (Platform.OS === 'android') {
      // Distinct 3-pulse vibration: Wait 0ms, Vibrate 400ms, Wait 200ms, Vibrate 400ms
      Vibration.vibrate([0, 400, 200, 400]);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch (error) {
    console.warn('Haptic alert error:', error);
  }
}
