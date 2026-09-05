import notifee, {
  AlarmType,
  AndroidImportance,
  AuthorizationStatus,
  TriggerType,
} from '@notifee/react-native';

// Dedicated high-importance channel used for the rest-timer completion alert.
export const REST_TIMER_CHANNEL_ID = 'rest-timer-v2';
// Stable notification id so rescheduling and cancelling always target the
// same OS notification.
export const REST_TIMER_ALERT_ID = 'rest-timer-alert';

// Monotonic counter appended to every scheduled notification id so that each
// timer run gets its own unique id. Android can suppress (or fail to re-alert)
// a trigger notification whose id was already delivered and dismissed, so we
// must never reuse a delivered id for a later run.
let restTimerSequence = 0;

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
 * OS-level timestamp trigger. Every call uses a fresh, unique notification id
 * so that starting the timer again after a previous alert was delivered and
 * dismissed still produces a brand-new notification. Returns the scheduled
 * notification id (or null if the alert could not be scheduled).
 */
export async function scheduleRestTimerNotification(seconds: number): Promise<string | null> {
  try {
    const settings = await notifee.getNotificationSettings();
    if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
      console.warn('Skipping rest-timer schedule — notifications not authorized.');
      return null;
    }

    restTimerSequence += 1;
    // Unique per-run id. The timestamp makes collisions impossible even across
    // app restarts, and the sequence guards against same-millisecond double taps.
    const id = `${REST_TIMER_ALERT_ID}-${Date.now()}-${restTimerSequence}`;

    const durationMs = Math.max(1, Math.round(seconds)) * 1000;

    await notifee.createTriggerNotification(
      {
        id,
        title: 'OMEGA — Rest Complete!',
        body: 'Time for your next set.',
        android: {
          channelId: REST_TIMER_CHANNEL_ID,
          autoCancel: false,
          pressAction: {
            id: 'default',
          },
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + durationMs,
        // SET_ALARM_CLOCK is Android's strongest alarm primitive (same one the
        // system clock app uses): it wakes the device in Doze mode and survives
        // aggressive OEM battery killers, so the alert fires even with the app
        // fully backgrounded or killed.
        alarmManager: {
          type: AlarmType.SET_ALARM_CLOCK,
        },
      }
    );

    return id;
  } catch (err) {
    console.warn('Failed to schedule rest timer notification:', err);
    return null;
  }
}

/**
 * Cancels the pending rest-complete alert referenced by `notificationId`.
 * `cancelRestTimerNotification` is retained for backwards compatibility: it
 * clears both a known pending id and any leftover pending trigger for the rest
 * timer, but never reuses a delivered id.
 */
export async function cancelRestTimerNotification(notificationId?: string | null): Promise<void> {
  try {
    if (notificationId) {
      await notifee.cancelTriggerNotifications([notificationId]).catch(() => {});
    }
    // Fallback: sweep the pending trigger list so a previous id (from before
    // this fix landed) can't linger and fire late on its own.
    const pending = await notifee.getTriggerNotificationIds().catch(() => []);
    await Promise.all(
      pending
        .filter((p) => p.startsWith(REST_TIMER_ALERT_ID))
        .map((p) => notifee.cancelTriggerNotifications([p]).catch(() => {}))
    );
  } catch (err) {
    console.warn('Failed to cancel rest timer notification:', err);
  }
}
