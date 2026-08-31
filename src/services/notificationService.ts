import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'workout-timer';
const REST_TIMER_ID = 'rest-timer';

// Configure notification handler for foreground notifications
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  // Gracefully fall back if unsupported in current environment
}

/**
 * LOCAL-ONLY notification mode.
 *
 * This app never touches remote push tokens: we deliberately do NOT call
 * `getExpoPushTokenAsync`, `getDevicePushTokenAsync`, or
 * `addPushTokenListener` anywhere, so no remote-token infrastructure is
 * used. Every notification is scheduled locally via
 * `scheduleNotificationAsync` with a `TIME_INTERVAL` trigger.
 */

/**
 * Initializes the rest-timer notification channel. Safe to call at app
 * startup; catches and gracefully handles environments where notifications are unsupported.
 */
export async function initNotifications(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Rest Timer',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    // Android 13+ / iOS require permission to display local notifications.
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted && settings.canAskAgain) {
      await Notifications.requestPermissionsAsync();
    }
  } catch (err) {
    console.warn('Failed to initialize notifications:', err);
  }
}

/**
 * Schedules a single rest-complete notification `seconds` from now.
 * Re-scheduling with the same identifier replaces any pending one.
 */
export async function scheduleRestTimerNotification(seconds: number): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: REST_TIMER_ID,
      content: {
        title: 'OMEGA — Rest Complete!',
        body: 'Time for your next set.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: CHANNEL_ID,
      },
    });
  } catch (err) {
    console.warn('Failed to schedule rest timer notification:', err);
  }
}

/** Cancels the pending rest-complete notification. */
export async function cancelRestTimerNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_TIMER_ID);
  } catch (err) {
    console.warn('Failed to cancel rest timer notification:', err);
  }
}

