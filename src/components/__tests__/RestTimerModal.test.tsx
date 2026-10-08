/**
 * UI behavior tests for the active-workout rest timer sheet.
 *
 * These drive the real component: the two infinite momentum wheels (snap
 * offsets, modulo selection, silent re-centring near the ends of the loop), the
 * countdown, and the `@notifee/react-native` scheduling call that receives the
 * picked duration.
 */
import { FlatList, PixelRatio, StyleSheet, Text, View } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import RestTimerModal, { ITEM_HEIGHT, wheelSnapOffsets } from '../RestTimerModal';

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

/** Number of distinct values on each wheel: minutes 0-60, seconds 0-59. */
const MINUTE_VALUES = 61;
const SECOND_VALUES = 60;
/** The component repeats each range this many times to make the wheel endless. */
const LOOP_COPIES = 5;
/** Rows visible at once — the middle one is parked in the selection box. */
const VISIBLE_ROWS = 5;
/** Distance from the viewport's top edge to the centre selection box. */
const SELECTION_BOX_TOP = (ITEM_HEIGHT * VISIBLE_ROWS - ITEM_HEIGHT) / 2;

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

/** The FlatList behind one of the wheels. */
function wheel(tree: ReactTestRenderer, testID: string) {
  const list = tree.root.findAllByType(FlatList).find((node) => node.props.testID === testID);
  if (!list) throw new Error(`wheel "${testID}" is not rendered`);
  return list;
}

/**
 * Absolute row index the wheel parks the current value on. The wheel keeps the
 * selection away from both ends of its loop, so the parked row is always a copy
 * of the value with a full range of travel in each direction.
 */
function parkedIndex(tree: ReactTestRenderer, testID: string, count: number): number {
  const index = wheel(tree, testID).props.initialScrollIndex as number;
  expect(index).toBeGreaterThanOrEqual(count);
  expect(index).toBeLessThan(count * (LOOP_COPIES - 1));
  return index;
}

/** The value the wheel considers selected. */
function parkedValue(tree: ReactTestRenderer, testID: string, count: number): number {
  return parkedIndex(tree, testID, count) % count;
}

/**
 * Flicks a wheel `rows` snap steps further down its list (negative = up) and
 * settles it there, exactly like a real fling ending on a row boundary. The
 * offset is taken from the wheel's own parked row, so it mirrors what a device
 * would report.
 */
async function flick(tree: ReactTestRenderer, testID: string, rows: number) {
  const list = wheel(tree, testID);
  const offsetY = ((list.props.initialScrollIndex as number) + rows) * ITEM_HEIGHT;
  await act(async () => {
    list.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { y: offsetY } } });
  });
}

/** The number on the row currently sitting under the centre highlight. */
function centeredValue(tree: ReactTestRenderer, accessibilityLabel: string): number {
  const labels = new Set<string>(
    tree.root
      .findAll(
        (node) =>
          node.props.accessibilityState?.selected === true &&
          typeof node.props.accessibilityLabel === 'string' &&
          new RegExp(`^${accessibilityLabel} \\d+$`).test(node.props.accessibilityLabel)
      )
      .map((node) => node.props.accessibilityLabel)
  );
  expect(labels.size).toBe(1);
  const [label] = [...labels];
  return Number(label.slice(accessibilityLabel.length + 1));
}

/** Taps a visible number, like a user poking a row of the wheel. */
async function tapRow(tree: ReactTestRenderer, accessibilityLabel: string) {
  const rows = tree.root.findAll(
    (node) =>
      node.props.accessibilityLabel === accessibilityLabel &&
      typeof node.props.onPress === 'function'
  );
  expect(rows.length).toBeGreaterThan(0);
  await act(async () => {
    rows[0].props.onPress();
  });
}

/** A locked wheel cannot be scrolled or tapped. */
function isLocked(tree: ReactTestRenderer, testID: string): boolean {
  return wheel(tree, testID).props.scrollEnabled === false;
}

/** The centre selection boxes drawn over the two wheels. */
function selectionBoxes(tree: ReactTestRenderer) {
  const boxes = tree.root.findAllByType(View).filter((node) => {
    const style = StyleSheet.flatten(node.props.style);
    return style?.position === 'absolute' && style.height === ITEM_HEIGHT;
  });
  expect(boxes).toHaveLength(2);
  return boxes;
}

/**
 * Mirrors a real tap on a control button: the node is re-resolved before every
 * press (so state updates between taps are observed) and a disabled button
 * ignores the press. Returns how many presses were actually delivered.
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
      expect(parkedValue(tree, 'rest-minutes-wheel', MINUTE_VALUES)).toBe(2);
      expect(parkedValue(tree, 'rest-seconds-wheel', SECOND_VALUES)).toBe(30);
      // The saved minutes are highlighted dead-centre of the wheel
      expect(centeredValue(tree, 'rest minutes')).toBe(2);

      await act(async () => tree.unmount());
    });

    it('falls back to the 60-second default when no preference is stored', async () => {
      const tree = await renderSheet();

      expect(countdownText(tree)).toBe('1:00');
      expect(renderedStrings(tree)).toEqual(expect.arrayContaining(['01', '00']));
      expect(centeredValue(tree, 'rest minutes')).toBe(1);
      expect(centeredValue(tree, 'rest seconds')).toBe(0);

      await act(async () => tree.unmount());
    });

    it('repeats each range so the wheel can be spun forever', async () => {
      const tree = await renderSheet();
      const seconds = wheel(tree, 'rest-seconds-wheel').props.data as number[];
      const minutes = wheel(tree, 'rest-minutes-wheel').props.data as number[];

      expect(minutes).toHaveLength(MINUTE_VALUES * LOOP_COPIES);
      expect(new Set(minutes).size).toBe(MINUTE_VALUES);
      expect(Math.min(...minutes)).toBe(0);
      expect(Math.max(...minutes)).toBe(60);
      // Every copy is the same lap of values
      expect(minutes[MINUTE_VALUES * 2 + 7]).toBe(7);

      expect(seconds).toHaveLength(SECOND_VALUES * LOOP_COPIES);
      expect(new Set(seconds).size).toBe(SECOND_VALUES);
      expect(Math.min(...seconds)).toBe(0);
      expect(Math.max(...seconds)).toBe(59);
      expect(seconds[SECOND_VALUES * 2 + 7]).toBe(7);

      await act(async () => tree.unmount());
    });

    it('snaps on a fixed row height and knows where every row sits', async () => {
      const tree = await renderSheet();
      const list = wheel(tree, 'rest-minutes-wheel');
      const data = list.props.data as number[];

      expect(list.props.decelerationRate).toBe('fast');
      expect(list.props.showsVerticalScrollIndicator).toBe(false);
      // One snap point per row rather than a fixed interval — see the density
      // test below for why the interval drifts off the row grid.
      expect(list.props.snapToOffsets).toHaveLength(data.length);

      const rowThree = list.props.getItemLayout(data, 3);
      const rowFour = list.props.getItemLayout(data, 4);
      expect(rowThree.length).toBe(ITEM_HEIGHT);
      expect(rowFour.offset - rowThree.offset).toBe(ITEM_HEIGHT);

      await act(async () => tree.unmount());
    });

    it('lands on the row grid even when a row is a fractional number of pixels', () => {
      // 44dp rows are 115.5px wide on a 2.625x screen and 123.75px on a 2.8125x
      // one, and the native `snapToInterval` conversion *truncates* those to
      // 115px / 123px. The snap grid then falls behind the laid-out row grid by
      // up to half a pixel per row: a wheel parked in the middle of its loop
      // (~row 122) stops a large fraction of a row away from the selection box.
      for (const density of [2.625, 2.8125]) {
        expect((ITEM_HEIGHT * density) % 1).not.toBe(0);
        const intervalPx = Math.trunc(ITEM_HEIGHT * density);
        const drift = Math.abs(intervalPx * 122 - Math.round(122 * ITEM_HEIGHT * density));
        expect(drift).toBeGreaterThan((ITEM_HEIGHT * density) / 4);

        // Snapping to each row's own offset instead puts every stop exactly on
        // the row grid, through the same truncating native conversion.
        wheelSnapOffsets(40, density).forEach((offset, index) => {
          expect(Math.trunc(offset * density)).toBe(
            Math.round(index * ITEM_HEIGHT * density)
          );
        });
      }
    });

    it('parks a resting row inside the centre selection box', async () => {
      const tree = await renderSheet();
      const list = wheel(tree, 'rest-minutes-wheel');

      // The content carries the selection box's own top offset as padding, so
      // the row grid lines up with the box: a wheel resting at
      // `index * ITEM_HEIGHT` has row `index` inside it (not at the top edge of
      // the viewport, which is what selected the wrong number).
      expect(StyleSheet.flatten(list.props.contentContainerStyle).paddingVertical).toBe(
        SELECTION_BOX_TOP
      );
      for (const box of selectionBoxes(tree)) {
        const boxStyle = StyleSheet.flatten(box.props.style);
        expect(boxStyle.top).toBe(SELECTION_BOX_TOP);
        expect(boxStyle.height).toBe(ITEM_HEIGHT);
      }

      // …and the row offsets stay measured from the content start, padding
      // excluded: `initialScrollIndex` / `scrollToIndex` scroll to exactly this
      // coordinate, and only the padding above turns it into a centred row.
      const data = list.props.data as number[];
      expect(list.props.getItemLayout(data, 0).offset).toBe(0);
      expect(list.props.getItemLayout(data, 7).offset).toBe(7 * ITEM_HEIGHT);

      // Snapping stops are the rows' own offsets, so whatever row a fling lands
      // on is the row that ends up in the box — on every screen density.
      const snapOffsets = list.props.snapToOffsets as number[];
      const density = PixelRatio.get();
      for (const index of [0, 1, 7, 123, snapOffsets.length - 1]) {
        expect(Math.trunc(snapOffsets[index] * density)).toBe(
          Math.round(index * ITEM_HEIGHT * density)
        );
      }
      expect(snapOffsets[snapOffsets.length - 1]).toBeGreaterThan(snapOffsets[0]);

      await act(async () => tree.unmount());
    });

    it('centres the digits vertically inside a row', async () => {
      const tree = await renderSheet();
      const rows = tree.root.findAll(
        (node) =>
          typeof node.props.accessibilityLabel === 'string' &&
          /^rest minutes \d+$/.test(node.props.accessibilityLabel)
      );
      expect(rows.length).toBeGreaterThan(0);

      for (const row of rows) {
        const rowStyle = StyleSheet.flatten(row.props.style);
        expect(rowStyle.height).toBe(ITEM_HEIGHT);
        expect(rowStyle.justifyContent).toBe('center');
        expect(rowStyle.alignItems).toBe('center');

        const texts = row.findAllByType(Text);
        expect(texts).toHaveLength(1);
        const textStyle = StyleSheet.flatten(texts[0].props.style);
        // The line box is the row itself, so the leading is split evenly above
        // and below the font's ascent/descent, and Android's font ascent padding
        // cannot push the glyphs off the centre.
        expect(textStyle.lineHeight).toBe(ITEM_HEIGHT);
        expect(textStyle.includeFontPadding).toBe(false);
      }

      await act(async () => tree.unmount());
    });

    it('retargets the duration for the set from the wheels', async () => {
      const tree = await renderSheet();

      await flick(tree, 'rest-minutes-wheel', 2); // 1:00 -> 3:00
      expect(countdownText(tree)).toBe('3:00');
      expect(centeredValue(tree, 'rest minutes')).toBe(3);

      await flick(tree, 'rest-seconds-wheel', 5); // -> 3:05
      expect(countdownText(tree)).toBe('3:05');
      expect(centeredValue(tree, 'rest seconds')).toBe(5);

      await flick(tree, 'rest-seconds-wheel', -5);
      expect(countdownText(tree)).toBe('3:00');

      await flick(tree, 'rest-minutes-wheel', -1);
      expect(countdownText(tree)).toBe('2:00');

      await act(async () => tree.unmount());
    });

    it('spins seconds past zero onto the other lap', async () => {
      const tree = await renderSheet();

      await flick(tree, 'rest-seconds-wheel', -1); // 00 -> 59, minutes stay put
      expect(parkedValue(tree, 'rest-seconds-wheel', SECOND_VALUES)).toBe(59);
      expect(countdownText(tree)).toBe('1:59');

      await flick(tree, 'rest-seconds-wheel', 1); // 59 -> 00
      expect(parkedValue(tree, 'rest-seconds-wheel', SECOND_VALUES)).toBe(0);
      expect(countdownText(tree)).toBe('1:00');

      await act(async () => tree.unmount());
    });

    it('wraps minutes back to zero past 60', async () => {
      const tree = await renderSheet();

      await flick(tree, 'rest-minutes-wheel', 59); // 1 -> 60, the top of the range
      expect(parkedValue(tree, 'rest-minutes-wheel', MINUTE_VALUES)).toBe(60);
      expect(countdownText(tree)).toBe('60:00');

      await flick(tree, 'rest-minutes-wheel', 1); // 60 -> 0
      expect(parkedValue(tree, 'rest-minutes-wheel', MINUTE_VALUES)).toBe(0);
      expect(countdownText(tree)).toBe('0:00');
      expect(isDisabled(tree, 'Start rest timer')).toBe(true);

      await act(async () => tree.unmount());
    });

    it('silently re-centres a wheel that settles near the end of its loop', async () => {
      const tree = await renderSheet();
      const parked = parkedIndex(tree, 'rest-seconds-wheel', SECOND_VALUES);
      const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex');

      // A full lap backwards lands in the first copy: the wheel hops back to the
      // middle copy without animating, so the spin never hits a wall.
      await flick(tree, 'rest-seconds-wheel', -SECOND_VALUES);

      expect(scrollToIndex).toHaveBeenCalledTimes(1);
      expect(scrollToIndex).toHaveBeenCalledWith({ index: parked, animated: false });
      expect(countdownText(tree)).toBe('1:00');

      await act(async () => tree.unmount());
    });

    it('animates a tapped number to the centre and selects it', async () => {
      const tree = await renderSheet();
      const parked = parkedIndex(tree, 'rest-minutes-wheel', MINUTE_VALUES);
      const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex');

      // Two rows below the centre, then one row above it again
      await tapRow(tree, 'rest minutes 3');
      expect(countdownText(tree)).toBe('3:00');
      expect(centeredValue(tree, 'rest minutes')).toBe(3);
      expect(scrollToIndex).toHaveBeenCalledWith({ index: parked + 2, animated: true });

      await tapRow(tree, 'rest minutes 1');
      expect(countdownText(tree)).toBe('1:00');
      expect(centeredValue(tree, 'rest minutes')).toBe(1);

      await act(async () => tree.unmount());
    });

    it('commits a slow drag release before the fling settles', async () => {
      const tree = await renderSheet();
      const parked = parkedIndex(tree, 'rest-minutes-wheel', MINUTE_VALUES);
      const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex');

      await act(async () => {
        wheel(tree, 'rest-minutes-wheel').props.onScrollEndDrag({
          nativeEvent: { contentOffset: { y: (parked + 1) * ITEM_HEIGHT } },
        });
      });

      expect(countdownText(tree)).toBe('2:00');
      // The silent re-centre waits for the fling to end, so it never fights the
      // snap animation the platform is running.
      expect(scrollToIndex).not.toHaveBeenCalled();

      await act(async () => tree.unmount());
    });

    it('will not start a zero-length rest', async () => {
      const tree = await renderSheet();

      await flick(tree, 'rest-minutes-wheel', -1);

      expect(countdownText(tree)).toBe('0:00');
      expect(isDisabled(tree, 'Start rest timer')).toBe(true);
      expect(await tap(tree, 'Start rest timer')).toBe(0);
      expect(notifee().default.createTriggerNotification).not.toHaveBeenCalled();

      await act(async () => tree.unmount());
    });

    it('locks both wheels while the countdown is running', async () => {
      // A frozen clock keeps the running countdown from ticking down mid-test.
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
      const tree = await renderSheet();

      await tap(tree, 'Start rest timer');

      expect(isLocked(tree, 'rest-minutes-wheel')).toBe(true);
      expect(isLocked(tree, 'rest-seconds-wheel')).toBe(true);
      expect(isDisabled(tree, 'Pause rest timer')).toBe(false);

      // Neither a flick nor a tap can retarget a running countdown
      await flick(tree, 'rest-minutes-wheel', 1);
      await tapRow(tree, 'rest minutes 2');
      expect(parkedValue(tree, 'rest-minutes-wheel', MINUTE_VALUES)).toBe(1);
      expect(countdownText(tree)).toBe('1:00');

      await act(async () => tree.unmount());
    });
  });

  describe('notification scheduling', () => {
    it('hands the exact picked duration to the notification scheduler', async () => {
      const tree = await renderSheet();

      await flick(tree, 'rest-minutes-wheel', 1); // 1:00 -> 2:00
      await flick(tree, 'rest-seconds-wheel', 45); // -> 2:45

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

      await flick(tree, 'rest-minutes-wheel', 1);
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
