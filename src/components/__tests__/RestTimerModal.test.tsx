/**
 * UI behavior tests for the active-workout rest timer sheet.
 *
 * These drive the real component: the minute/second steppers, the countdown,
 * and the `@notifee/react-native` scheduling call that receives the picked
 * duration.
 */
import { Text } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import RestTimerModal from '../RestTimerModal';

type NotifeeMock = {
  AlarmType: Record<string, number>;
  default: {
    getNotificationSettings: jest.Mock;
    createTriggerNotification: jest.Mock;
    cancelTriggerNotifications: jest.Mock;
    getTriggerNotificationIds: jest.Mock;
  };
};

const notifee = () => require('@notifee/react-native') as unknown as NotifeeMock;
const asyncStorage = () =>
  require('@react-native-async-storage/async-storage') as unknown as {
    __resetAsyncStorage: () => void;
    default: { setItem: (key: string, value: string) => Promise<void> };
  };

/** Flattens every string rendered anywhere in the tree. */
function collectStrings(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(collectStrings);
  if (node && typeof node === 'object' && 'props' in (node as Record<string, unknown>)) {
    return collectStrings((node as { props: { children?: unknown } }).props.children);
  }
  return [];
}

function renderedStrings(tree: ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).flatMap((node) => collectStrings(node.props.children));
}

function countdownText(tree: ReactTestRenderer): string {
  // First Text in the sheet is the big m:ss countdown
  return collectStrings(tree.root.findAllByType(Text)[1].props.children).join('');
}

async function renderSheet(onClose: () => void = () => {}) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<RestTimerModal visible onClose={onClose} />);
  });
  return tree;
}

/**
 * Mirrors a real tap: the node is re-resolved before every press (so state
 * updates between taps are observed) and a disabled button ignores the press.
 * Returns how many presses were actually delivered.
 */
async function tap(tree: ReactTestRenderer, accessibilityLabel: string, times = 1): Promise<number> {
  let delivered = 0;
  for (let i = 0; i < times; i++) {
    const button = tree.root.findByProps({ accessibilityLabel });
    if (button.props.disabled === true) continue;
    await act(async () => {
      button.props.onPress();
    });
    delivered++;
  }
  return delivered;
}

function isDisabled(tree: ReactTestRenderer, accessibilityLabel: string): boolean {
  return tree.root.findByProps({ accessibilityLabel }).props.disabled === true;
}

function scheduledTrigger() {
  const calls = notifee().default.createTriggerNotification.mock.calls;
  expect(calls).toHaveLength(1);
  return calls[0][1] as {
    type: number;
    timestamp: number;
    alarmManager?: { type: number };
  };
}

describe('RestTimerModal', () => {
  beforeEach(() => {
    asyncStorage().__resetAsyncStorage();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('target duration picker', () => {
    it('opens on the saved rest-timer preference', async () => {
      await asyncStorage().default.setItem(
        '@default_rest_timer',
        '150000' // 2 min 30 sec
      );

      const tree = await renderSheet();

      expect(countdownText(tree)).toBe('2:30');
      expect(renderedStrings(tree)).toEqual(expect.arrayContaining(['02', '30']));

      await act(async () => tree.unmount());
    });

    it('falls back to the 60-second default when no preference is stored', async () => {
      const tree = await renderSheet();

      expect(countdownText(tree)).toBe('1:00');
      expect(renderedStrings(tree)).toEqual(expect.arrayContaining(['01', '00']));

      await act(async () => tree.unmount());
    });

    it('retargets the duration for the set from the steppers', async () => {
      const tree = await renderSheet();

      await tap(tree, 'Increase rest minutes', 2);
      await tap(tree, 'Increase rest seconds', 5);

      expect(countdownText(tree)).toBe('3:05');

      await tap(tree, 'Decrease rest minutes', 1);
      expect(countdownText(tree)).toBe('2:05');

      await act(async () => tree.unmount());
    });

    it('clamps minutes at 60 and seconds at 0-59', async () => {
      const tree = await renderSheet();

      await tap(tree, 'Increase rest minutes', 61);
      expect(countdownText(tree)).toBe('60:00');
      expect(isDisabled(tree, 'Increase rest minutes')).toBe(true);

      // Further taps on a maxed-out stepper are ignored
      expect(await tap(tree, 'Increase rest minutes', 3)).toBe(0);
      expect(countdownText(tree)).toBe('60:00');

      await tap(tree, 'Decrease rest minutes', 61);
      expect(countdownText(tree)).toBe('0:00');
      expect(isDisabled(tree, 'Decrease rest minutes')).toBe(true);
      expect(isDisabled(tree, 'Decrease rest seconds')).toBe(true);

      // Seconds cannot exceed 59 either
      await tap(tree, 'Increase rest minutes', 1);
      await tap(tree, 'Increase rest seconds', 60);
      expect(countdownText(tree)).toBe('1:59');
      expect(isDisabled(tree, 'Increase rest seconds')).toBe(true);

      await act(async () => tree.unmount());
    });

    it('will not start a zero-length rest', async () => {
      const tree = await renderSheet();

      await tap(tree, 'Decrease rest minutes', 1);

      expect(countdownText(tree)).toBe('0:00');
      expect(isDisabled(tree, 'Start rest timer')).toBe(true);
      expect(await tap(tree, 'Start rest timer')).toBe(0);
      expect(notifee().default.createTriggerNotification).not.toHaveBeenCalled();

      await act(async () => tree.unmount());
    });

    it('disables the steppers while the countdown is running', async () => {
      const tree = await renderSheet();

      await tap(tree, 'Start rest timer');

      expect(isDisabled(tree, 'Increase rest minutes')).toBe(true);
      expect(isDisabled(tree, 'Decrease rest seconds')).toBe(true);
      expect(isDisabled(tree, 'Pause rest timer')).toBe(false);

      await act(async () => tree.unmount());
    });
  });

  describe('notification scheduling', () => {
    it('hands the exact picked duration to the notification scheduler', async () => {
      const tree = await renderSheet();

      await tap(tree, 'Increase rest minutes', 1); // 1:00 -> 2:00
      await tap(tree, 'Increase rest seconds', 45); // -> 2:45

      const beforeStart = Date.now();
      await tap(tree, 'Start rest timer');

      const trigger = scheduledTrigger();
      expect(trigger.timestamp).toBeGreaterThanOrEqual(beforeStart + 165_000);
      expect(trigger.timestamp).toBeLessThanOrEqual(Date.now() + 165_000);
      expect(trigger.alarmManager?.type).toBe(notifee().AlarmType.SET_ALARM_CLOCK);

      await act(async () => tree.unmount());
    });

    it('cancels the pending alert when the session is ended', async () => {
      const onClose = jest.fn();
      const tree = await renderSheet(onClose);

      await tap(tree, 'Start rest timer');
      const scheduledId = notifee().default.createTriggerNotification.mock.calls[0][0].id;

      await tap(tree, 'End rest timer');

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(notifee().default.cancelTriggerNotifications).toHaveBeenCalledWith([scheduledId]);

      await act(async () => tree.unmount());
    });

    it('re-schedules the alert when the timer is restarted', async () => {
      const tree = await renderSheet();

      await tap(tree, 'Increase rest minutes', 1);
      await tap(tree, 'Start rest timer');
      await tap(tree, 'Restart rest timer');

      expect(notifee().default.createTriggerNotification).toHaveBeenCalledTimes(2);
      // Both runs target the picked 2-minute duration
      for (const [, trigger] of notifee().default.createTriggerNotification.mock.calls) {
        expect(trigger.timestamp).toBeGreaterThan(Date.now() + 110_000);
      }

      await act(async () => tree.unmount());
    });
  });
});
