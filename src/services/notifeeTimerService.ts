import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  TriggerType,
} from '@notifee/react-native';

// Dedicated high-importance channel used for the rest-timer completion alert.
export const REST_TIMER_CHANNEL_ID = 'rest-timer-v2';
// Stable notification id so rescheduling and cancelling always target the
// same OS notification.
export const REST_TIMER_ALERT_ID = 'rest-timer-alert';

/**
 * Initializes the rest-timer notification path. Safe to call once at app
 * startup: explicitly requests user permission and registers the dedicated
 * high-importance channel with default sound and vibration.
 */
export async function initNotifee(): Promise<void> {
  try {
    const settings = await notifee.requestPermission();
    if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
      console.warn('Notification permissions not granted');
    }

    await notifee.createChannel({
      id: REST_TIMER_CHANNEL_ID,
      name: 'Rest Timer',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
  } catch (err) {
    // Notifee is a native module and requires a development build. If it is
    // unavailable (e.g. Expo Go), degrade gracefully instead of crashing.
    console.warn('Failed to initialize notifee:', err);
  }
}

/**
 * Schedules the rest-complete alert to fire `seconds` from now using an
 * OS-level timestamp trigger. Re-scheduling with the same notification id
 * replaces any pending alert, so it is safe to call repeatedly.
 */
export async function scheduleRestTimerNotification(seconds: number): Promise<void> {
  try {
    const settings = await notifee.getNotificationSettings();
    if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
      console.warn('Skipping rest-timer schedule — notifications not authorized.');
      return;
    }

    // Cancel any previously scheduled rest-timer alert first.
    await notifee.cancelNotification(REST_TIMER_ALERT_ID).catch(() => {});

    const durationMs = Math.max(1, Math.round(seconds)) * 1000;

    await notifee.createTriggerNotification(
      {
        id: REST_TIMER_ALERT_ID,
        title: 'OMEGA — Rest Complete!',
        body: 'Time for your next set.',
        android: {
          channelId: REST_TIMER_CHANNEL_ID,
          // A plain (non-foreground-service) notification must NOT be marked
          // ongoing:true — Android only guarantees an ongoing notification
          // from an active foreground service and may drop it otherwise
          // (which is why the alert stopped arriving). Instead we keep the
          // alert as a normal HIGH/MAX notification that:
          //  - alerts with sound/vibration reliably (autoCancel has no effect
          //    on heads-up delivery), and
          //  - autoCancel:false keeps it in the shade after the user taps it
          //    instead of vanishing (single swipe still dismisses).
          autoCancel: false,
          pressAction: {
            id: 'default',
          },
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + durationMs,
      }
    );
  } catch (err) {
    console.warn('Failed to schedule rest timer notification:', err);
  }
}

/**
 * Cancels any pending rest-complete alert. Call when the user pauses, stops,
 * resets, or finishes the timer early, or when the timer screen is left.
 */
export async function cancelRestTimerNotification(): Promise<void> {
  try {
    await notifee.cancelNotification(REST_TIMER_ALERT_ID);
  } catch (err) {
    console.warn('Failed to cancel rest timer notification:', err);
  }
}
