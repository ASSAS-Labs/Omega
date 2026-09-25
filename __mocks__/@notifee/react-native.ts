/**
 * Jest manual mock for `@notifee/react-native`.
 *
 * The real package throws at import time without the native module, so tests
 * get the enums (matching the real numeric values) plus jest.fn() stubs whose
 * return values each test can drive.
 */
export enum AndroidImportance {
  MIN = 1,
  LOW = 2,
  DEFAULT = 3,
  HIGH = 4,
}

export enum AuthorizationStatus {
  NOT_DETERMINED = -1,
  DENIED = 0,
  AUTHORIZED = 1,
  PROVISIONAL = 2,
}

export enum AndroidNotificationSetting {
  NOT_SUPPORTED = -1,
  DISABLED = 0,
  ENABLED = 1,
}

export enum TriggerType {
  TIMESTAMP = 0,
  INTERVAL = 1,
}

export enum AlarmType {
  SET = 0,
  SET_AND_ALLOW_WHILE_IDLE = 1,
  SET_EXACT = 2,
  SET_EXACT_AND_ALLOW_WHILE_IDLE = 3,
  SET_ALARM_CLOCK = 4,
}

export interface NotificationSettingsLike {
  authorizationStatus: AuthorizationStatus;
  android: { alarm: AndroidNotificationSetting };
}

/** Test helper: builds the notification settings shape notifee returns. */
export function __notificationSettings(options: {
  authorized?: boolean;
  alarm?: AndroidNotificationSetting;
}): NotificationSettingsLike {
  return {
    authorizationStatus:
      options.authorized === false ? AuthorizationStatus.DENIED : AuthorizationStatus.AUTHORIZED,
    android: { alarm: options.alarm ?? AndroidNotificationSetting.ENABLED },
  };
}

const notifee = {
  requestPermission: jest.fn(async () => __notificationSettings({})),
  getNotificationSettings: jest.fn(async () => __notificationSettings({})),
  openAlarmPermissionSettings: jest.fn(async () => {}),
  createChannel: jest.fn(async () => 'channel-id'),
  createTriggerNotification: jest.fn(async () => 'trigger-id'),
  cancelTriggerNotifications: jest.fn(async () => {}),
  getTriggerNotificationIds: jest.fn(async () => [] as string[]),
};

export default notifee;
