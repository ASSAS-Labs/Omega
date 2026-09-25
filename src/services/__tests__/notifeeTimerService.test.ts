/**
 * Tests for the rest-timer notification service, focused on Android 13+ exact
 * alarm resilience. `@notifee/react-native` is replaced by the manual mock in
 * `__mocks__/@notifee/react-native.ts`, whose stubs return values are driven by
 * each test.
 *
 * NOTE: the notifee handle is loaded with `require` (not `jest.requireMock`) so
 * that it is the exact instance the service under test talks to.
 */
import type * as NotifeeService from '../notifeeTimerService';

type NotifeeMock = {
  AlarmType: Record<string, number>;
  AndroidNotificationSetting: Record<string, number>;
  AuthorizationStatus: Record<string, number>;
  TriggerType: Record<string, number>;
  __notificationSettings: (options: { authorized?: boolean; alarm?: number }) => unknown;
  default: {
    requestPermission: jest.Mock;
    getNotificationSettings: jest.Mock;
    openAlarmPermissionSettings: jest.Mock;
    createChannel: jest.Mock;
    createTriggerNotification: jest.Mock;
    cancelTriggerNotifications: jest.Mock;
    getTriggerNotificationIds: jest.Mock;
  };
};

const notifee = () => require('@notifee/react-native') as unknown as NotifeeMock;
const loadService = () => require('../notifeeTimerService') as typeof NotifeeService;

/** Settings payload with notifications granted and exact alarms enabled. */
const grantedWithExactAlarms = () => notifee().__notificationSettings({ alarm: 1 });
const grantedWithoutExactAlarms = () =>
  notifee().__notificationSettings({ alarm: 0 /* AndroidNotificationSetting.DISABLED */ });

describe('notifeeTimerService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('exact alarm resolution', () => {
    it('uses the strongest alarm primitive when exact alarms are granted', async () => {
      const mock = notifee();
      mock.default.getNotificationSettings.mockResolvedValue(grantedWithExactAlarms());

      const alarmType = await loadService().resolveRestTimerAlarmType();

      expect(alarmType).toBe(mock.AlarmType.SET_ALARM_CLOCK);
      expect(mock.default.openAlarmPermissionSettings).not.toHaveBeenCalled();
    });

    it('treats pre-Android-12 devices (NOT_SUPPORTED) as exact-alarm capable', async () => {
      const mock = notifee();
      mock.default.getNotificationSettings.mockResolvedValue(
        mock.__notificationSettings({ alarm: -1 /* NOT_SUPPORTED */ })
      );

      expect(await loadService().resolveRestTimerAlarmType()).toBe(mock.AlarmType.SET_ALARM_CLOCK);
    });

    it('surfaces the Alarms & reminders screen once, then uses exact alarms if granted', async () => {
      const mock = notifee();
      mock.default.getNotificationSettings
        .mockResolvedValueOnce(grantedWithoutExactAlarms())
        .mockResolvedValue(grantedWithExactAlarms());

      const service = loadService();
      expect(await service.resolveRestTimerAlarmType()).toBe(mock.AlarmType.SET_ALARM_CLOCK);
      expect(mock.default.openAlarmPermissionSettings).toHaveBeenCalledTimes(1);
    });

    it('falls back to inexact scheduling when the permission stays restricted', async () => {
      const mock = notifee();
      mock.default.getNotificationSettings.mockResolvedValue(grantedWithoutExactAlarms());

      const service = loadService();
      expect(await service.resolveRestTimerAlarmType()).toBeNull();
      expect(mock.default.openAlarmPermissionSettings).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalled();
    });

    it('prompts at most once per session', async () => {
      const mock = notifee();
      mock.default.getNotificationSettings.mockResolvedValue(grantedWithoutExactAlarms());

      const service = loadService();
      await service.resolveRestTimerAlarmType();
      await service.resolveRestTimerAlarmType();
      await service.resolveRestTimerAlarmType();

      expect(mock.default.openAlarmPermissionSettings).toHaveBeenCalledTimes(1);
    });

    it('still resolves the fallback when the settings screen cannot be opened', async () => {
      const mock = notifee();
      mock.default.getNotificationSettings.mockResolvedValue(grantedWithoutExactAlarms());
      mock.default.openAlarmPermissionSettings.mockRejectedValueOnce(
        new Error('activity not available')
      );

      const service = loadService();
      expect(await service.resolveRestTimerAlarmType()).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        'Could not open the exact alarm settings screen:',
        expect.any(Error)
      );
    });
  });

  describe('scheduling the rest-complete alert', () => {
    it('schedules an exact timestamp trigger with a unique, per-run id', async () => {
      const mock = notifee();
      mock.default.getNotificationSettings.mockResolvedValue(grantedWithExactAlarms());

      const service = loadService();
      const first = await service.scheduleRestTimerNotification(90);
      const second = await service.scheduleRestTimerNotification(90);

      expect(first).toMatch(new RegExp(`^${service.REST_TIMER_ALERT_ID}-`));
      expect(second).not.toBe(first);

      const [, trigger] = mock.default.createTriggerNotification.mock.calls[0];
      expect(trigger.type).toBe(mock.TriggerType.TIMESTAMP);
      expect(trigger.alarmManager).toEqual({ type: mock.AlarmType.SET_ALARM_CLOCK });
      // 90 seconds of rest, not the 60s default
      expect(trigger.timestamp).toBeGreaterThan(Date.now() + 85_000);
      expect(trigger.timestamp).toBeLessThanOrEqual(Date.now() + 91_000);
    });

    it('schedules on the inexact path (no alarmManager) when exact alarms are blocked', async () => {
      const mock = notifee();
      mock.default.getNotificationSettings.mockResolvedValue(grantedWithoutExactAlarms());
      mock.default.requestPermission.mockResolvedValue(grantedWithoutExactAlarms());

      const id = await loadService().scheduleRestTimerNotification(45);

      expect(id).not.toBeNull();
      const [, trigger] = mock.default.createTriggerNotification.mock.calls[0];
      expect(trigger.alarmManager).toBeUndefined();
      expect(trigger.timestamp).toBeGreaterThan(Date.now() + 40_000);
    });

    it('skips scheduling entirely when notifications are not authorized', async () => {
      const mock = notifee();
      mock.default.getNotificationSettings.mockResolvedValue(
        mock.__notificationSettings({ authorized: false })
      );

      const id = await loadService().scheduleRestTimerNotification(60);

      expect(id).toBeNull();
      expect(mock.default.createTriggerNotification).not.toHaveBeenCalled();
    });

    it('degrades gracefully when the native scheduler throws', async () => {
      const mock = notifee();
      mock.default.getNotificationSettings.mockResolvedValue(grantedWithExactAlarms());
      mock.default.createTriggerNotification.mockRejectedValueOnce(new Error('alarm manager offline'));

      await expect(loadService().scheduleRestTimerNotification(60)).resolves.toBeNull();
    });

    it('clamps sub-second durations to at least one millisecond of delay', async () => {
      const mock = notifee();
      mock.default.getNotificationSettings.mockResolvedValue(grantedWithExactAlarms());

      await loadService().scheduleRestTimerNotification(0);

      const [, trigger] = mock.default.createTriggerNotification.mock.calls[0];
      expect(trigger.timestamp).toBeGreaterThan(Date.now());
    });
  });

  describe('cancellation', () => {
    it('cancels the tracked notification id together with any leftover trigger', async () => {
      const mock = notifee();
      mock.default.getTriggerNotificationIds.mockResolvedValue([
        'rest-timer-alert-stale',
        'unrelated-notification',
      ]);

      await loadService().cancelRestTimerNotification('rest-timer-alert-123-1');

      expect(mock.default.cancelTriggerNotifications).toHaveBeenCalledWith([
        'rest-timer-alert-123-1',
      ]);
      expect(mock.default.cancelTriggerNotifications).toHaveBeenCalledWith([
        'rest-timer-alert-stale',
      ]);
      expect(mock.default.cancelTriggerNotifications).not.toHaveBeenCalledWith([
        'unrelated-notification',
      ]);
    });

    it('never throws when the native cancel call fails', async () => {
      const mock = notifee();
      mock.default.cancelTriggerNotifications.mockRejectedValue(new Error('no such notification'));

      await expect(loadService().cancelRestTimerNotification('rest-timer-alert-1')).resolves.toBeUndefined();
    });
  });

  describe('initialization', () => {
    it('requests permission and registers the high-importance channel', async () => {
      const mock = notifee();
      mock.default.requestPermission.mockResolvedValue(grantedWithExactAlarms());

      await loadService().initNotifee();

      expect(mock.default.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: loadService().REST_TIMER_CHANNEL_ID,
          importance: 4, // AndroidImportance.HIGH
          vibration: true,
        })
      );
    });

    it('never throws when notifee is unavailable (e.g. Expo Go)', async () => {
      const mock = notifee();
      mock.default.requestPermission.mockRejectedValue(new Error('Notifee native module not found.'));

      await expect(loadService().initNotifee()).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalled();
    });

    it('flags a restricted exact-alarm state at startup without forcing a redirect', async () => {
      const mock = notifee();
      mock.default.requestPermission.mockResolvedValue(grantedWithoutExactAlarms());

      await loadService().initNotifee();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Exact alarms are disabled')
      );
      expect(mock.default.openAlarmPermissionSettings).not.toHaveBeenCalled();
    });
  });
});
