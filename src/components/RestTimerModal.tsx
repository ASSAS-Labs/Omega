/**
 * Rest timer sheet for an active workout.
 *
 * The duration is picked on two infinite momentum wheels (minutes 0-60,
 * seconds 0-59) built from plain `FlatList`s: rows snap to a fixed height, the
 * row parked under the centre highlight is the selected one, and the value
 * range is repeated several times so the wheel can be flicked forever in either
 * direction without hitting a hard end.
 *
 * Geometry contract (shared by the highlight, the selection math and the
 * programmatic scrolls): the list content is padded by exactly the distance
 * from the viewport's top edge to the selection box, so a wheel resting at
 * scroll offset `index * ITEM_HEIGHT` has row `index` sitting dead-centre in
 * that box — which is the row the wheels report upwards.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ListRenderItemInfo, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { EXIT_DURATION, SHEET_SPRING, SHEET_TRAVEL } from '../theme/motion';
import PressFeedback from './PressFeedback';
import { getDefaultRestDurationMs } from '../services/restTimerPrefs';
import {
  cancelRestTimerNotification,
  scheduleRestTimerNotification,
} from '../services/notifeeTimerService';
import { triggerRestTimerFinishedAlert } from '../services/timerAlertService';
import { useTimeSync } from '../hooks/useTimeSync';

interface RestTimerModalProps {
  visible: boolean;
  onClose: () => void;
}

// Interactive picker bounds: 0-60 minutes, 0-59 seconds
const MAX_PICKER_MINUTES = 60;
const MAX_PICKER_SECONDS = 59;

/** Height of a single wheel row — also the scroll snap interval. */
export const ITEM_HEIGHT = 44;
// Odd row count so exactly one row sits under the centre highlight.
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
// Vertical offset of the centre row inside the viewport, i.e. where the
// selection highlight sits. The list content is padded by this same amount at
// both ends (`styles.wheelContent`), which is what makes the offset math work
// out: with the padding in place the row at scroll offset `index * ITEM_HEIGHT`
// is exactly the row `index` parked under the highlight, and edge rows can be
// scrolled into the selection box too.
const WHEEL_CENTER_TOP = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;
// The value range is repeated this many times and the wheel is kept in the
// middle copy, which gives it a full copy of travel in each direction. Hopping
// between copies is invisible because the layout repeats every `count` rows.
const LOOP_COPIES = 5;
const MIDDLE_COPY = Math.floor(LOOP_COPIES / 2);

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function splitMs(ms: number): { minutes: number; seconds: number } {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  return {
    minutes: Math.min(MAX_PICKER_MINUTES, Math.floor(totalSec / 60)),
    seconds: totalSec % 60,
  };
}

/**
 * Fixed row geometry: every row is ITEM_HEIGHT tall, so row `index` rests at
 * `index * ITEM_HEIGHT`.
 *
 * The offset deliberately stays measured from the content start *without* the
 * `wheelContent` vertical padding. `initialScrollIndex` and `scrollToIndex`
 * both scroll to exactly this offset (VirtualizedList subtracts nothing), and
 * because the padding already lifts the row grid by `WHEEL_CENTER_TOP`, that
 * offset parks row `index` in the centre selection box rather than against the
 * top edge of the viewport. Adding the padding here would shift every wheel.
 */
function wheelItemLayout(_data: ArrayLike<number> | null | undefined, index: number) {
  return { length: ITEM_HEIGHT, offset: index * ITEM_HEIGHT, index };
}

/**
 * Row parked in the centre selection box for a scroll offset reported by the
 * list. Thanks to the content padding the row grid is aligned with the box, so
 * the resting offset of row `index` is a plain multiple of ITEM_HEIGHT and this
 * is the exact inverse of `wheelItemLayout`.
 */
function centeredRowAt(offsetY: number): number {
  return Math.round(offsetY / ITEM_HEIGHT);
}

/**
 * Scroll offsets (in dp), one per row, that park that row in the selection box.
 *
 * A plain `snapToInterval={ITEM_HEIGHT}` is not accurate enough: both platforms
 * convert a dp interval into device pixels by *truncating* it (Android does
 * `(interval * density).toInt()`), while the rows are laid out by Yoga on the
 * rounded pixel grid. A 44dp row is 115.5px at 2.625x and 123.75px at 2.8125x,
 * so the snap grid ends up up to half a pixel *per row* behind the row grid and
 * the gap grows with the distance spun: near the middle copy (row ~120) the
 * wheel comes to rest tens of dp off centre — a landed number then sits outside
 * the middle of the highlight even though nothing else moved.
 *
 * Snapping to each row's own offset instead rounds every stop on its own, so the
 * conversion error can never accumulate (worst case one pixel on any density).
 * The extra half pixel is what survives the native truncation — `round(px) + 0.5`
 * truncates back to `round(px)` however the platform rounds the dp→px
 * conversion (on iOS that half pixel is a third of a point, i.e. sub-pixel).
 */
export function wheelSnapOffsets(rows: number, density: number): number[] {
  return Array.from(
    { length: rows },
    (_, index) => (Math.round(index * ITEM_HEIGHT * density) + 0.5) / density
  );
}

function wheelKeyExtractor(_item: number, index: number): string {
  return String(index);
}

interface WheelColumnProps {
  label: string;
  value: number;
  /** Inclusive upper bound of the range (minutes stop at 60, seconds at 59). */
  max: number;
  disabled: boolean;
  onChange: (next: number) => void;
  accessibilityLabel: string;
  testID: string;
}

/**
 * One flickable momentum wheel. The range is laid out `LOOP_COPIES` times and
 * the selected row is always tracked by its absolute list index, so the value
 * is `index % count` (modulo arithmetic) and the wheel can wrap around for
 * free. Whenever the wheel settles outside the middle copy it hops back there
 * without animating, which is what makes the spin look endless.
 *
 * Memoized: the countdown re-renders this sheet four times a second while it
 * runs, and neither wheel changes during a run — without the memo every tick
 * would re-render 300+ wheel rows on the JS thread.
 */
const WheelColumn = memo(function WheelColumn({
  label,
  value,
  max,
  disabled,
  onChange,
  accessibilityLabel,
  testID,
}: WheelColumnProps) {
  const count = max + 1;
  const listRef = useRef<FlatList<number>>(null);
  // The range repeated LOOP_COPIES times (e.g. [0..59, 0..59, ...]).
  const loop = useMemo(
    () => Array.from({ length: count * LOOP_COPIES }, (_, index) => index % count),
    [count]
  );
  // Absolute index that parks `next` dead-centre in the middle copy: the wheel
  // scrolls to `index * ITEM_HEIGHT`, which the content padding lines up with
  // the selection box.
  const centeredIndex = useCallback(
    (next: number) => MIDDLE_COPY * count + Math.min(max, Math.max(0, Math.round(next))),
    [count, max]
  );
  const [activeIndex, setActiveIndex] = useState(() => centeredIndex(value));
  // One snap point per row, on the device's pixel grid, so a fling always
  // finishes with the row it targets exactly in the selection box.
  const snapOffsets = useMemo(
    () => wheelSnapOffsets(loop.length, PixelRatio.get()),
    [loop.length]
  );
  // Last value this wheel reported upwards: lets a parent-driven change (saved
  // preference, restart) be told apart from the wheel's own pick.
  const reportedRef = useRef<number | null>(null);

  const scrollToIndex = useCallback((index: number, animated: boolean) => {
    listRef.current?.scrollToIndex({ index, animated });
  }, []);

  // The initial position is handled by `initialScrollIndex`; this covers the
  // parent pushing a new duration in later (preference load, restart, ticks).
  useEffect(() => {
    if (reportedRef.current === null) {
      reportedRef.current = value;
      return;
    }
    if (reportedRef.current === value) return;
    reportedRef.current = value;
    setActiveIndex(centeredIndex(value));
    scrollToIndex(centeredIndex(value), false);
  }, [centeredIndex, scrollToIndex, value]);

  /**
   * Commits the row that ended up under the highlight. `recenter` is only set
   * once the wheel has stopped moving, so the silent hop back to the middle
   * copy never fights an in-flight snap animation.
   */
  const settle = useCallback(
    (offsetY: number, recenter: boolean) => {
      if (disabled) return;
      const raw = centeredRowAt(offsetY);
      const index = Math.min(loop.length - 1, Math.max(0, raw));
      const next = index % count;
      const home = centeredIndex(next);
      if (recenter && index !== home) {
        // Out near the ends of the loop: jump back to the middle copy without
        // animating, so the spin continues seamlessly.
        scrollToIndex(home, false);
        setActiveIndex(home);
      } else {
        setActiveIndex(index);
      }
      if (reportedRef.current !== next) {
        reportedRef.current = next;
        onChange(next);
      }
    },
    [centeredIndex, count, disabled, loop.length, onChange, scrollToIndex]
  );

  // Highlight only: the selected value is committed when the wheel settles.
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const raw = centeredRowAt(event.nativeEvent.contentOffset.y);
      const index = Math.min(loop.length - 1, Math.max(0, raw));
      if (index !== activeIndex) setActiveIndex(index);
    },
    [activeIndex, loop.length]
  );

  // Tap fallback: bring the tapped row to the centre and select it.
  const handleRowPress = useCallback(
    (index: number) => {
      if (disabled) return;
      const next = index % count;
      setActiveIndex(index);
      scrollToIndex(index, true);
      if (reportedRef.current !== next) {
        reportedRef.current = next;
        onChange(next);
      }
    },
    [count, disabled, onChange, scrollToIndex]
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<number>) => {
      const centered = index === activeIndex;
      return (
        <Pressable
          style={styles.wheelItem}
          onPress={() => handleRowPress(index)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityLabel} ${item}`}
          accessibilityState={{ selected: centered, disabled }}
        >
          <Text
            style={[
              styles.wheelItemText,
              centered ? styles.wheelItemTextCentered : styles.wheelItemTextIdle,
            ]}
          >
            {item.toString().padStart(2, '0')}
          </Text>
        </Pressable>
      );
    },
    [accessibilityLabel, activeIndex, disabled, handleRowPress]
  );

  return (
    <View style={[styles.wheelColumn, disabled && styles.wheelColumnDisabled]}>
      <Text style={styles.wheelLabel}>{label}</Text>

      <View style={styles.wheelViewport}>
        <FlatList
          ref={listRef}
          testID={testID}
          accessibilityLabel={`${accessibilityLabel} wheel`}
          data={loop}
          keyExtractor={wheelKeyExtractor}
          renderItem={renderItem}
          getItemLayout={wheelItemLayout}
          initialScrollIndex={centeredIndex(value)}
          initialNumToRender={VISIBLE_ROWS + 2}
          windowSize={5}
          snapToOffsets={snapOffsets}
          decelerationRate="fast"
          contentContainerStyle={styles.wheelContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEnabled={!disabled}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onScrollEndDrag={(event) => settle(event.nativeEvent.contentOffset.y, false)}
          onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.y, true)}
          style={styles.wheelList}
        />

        {/* Centre highlight for the row that is currently selected */}
        <View pointerEvents="none" style={styles.wheelHighlight} />
      </View>
    </View>
  );
});

export default function RestTimerModal({ visible, onClose }: RestTimerModalProps) {
  const [durationMs, setDurationMs] = useState(60000);
  const [remainingMs, setRemainingMs] = useState(60000);
  const [running, setRunning] = useState(false);
  const endRef = useRef(0);
  // Id of the notification we most recently scheduled for the current run, so
  // pausing/stopping cancels exactly that pending alert.
  const pendingNotificationIdRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Native-thread open/close transition.
  //
  // `visible` still drives mounting, but the sheet stays mounted for the length
  // of the exit animation (`mounted`) so the dismiss is animated too. Progress
  // lives in a shared value that a worklet maps onto composite properties only
  // — opacity plus translateY/scale — so the whole transition is rendered on
  // the Android UI thread and never waits for a JS re-render. The RN `Modal`
  // runs with `animationType="none"` because Reanimated now owns the motion.
  // ---------------------------------------------------------------------------
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (visible) {
      wasVisibleRef.current = true;
      setMounted(true);
      progress.value = withSpring(1, SHEET_SPRING);
      return;
    }
    if (!wasVisibleRef.current) return;
    wasVisibleRef.current = false;
    progress.value = withTiming(0, { duration: EXIT_DURATION });
    // Unmounting is driven by a timer rather than the animation callback so the
    // modal can never be left mounted on screen if an animation is interrupted.
    const timer = setTimeout(() => setMounted(false), EXIT_DURATION);
    return () => clearTimeout(timer);
  }, [progress, visible]);

  /** Dimmer behind the sheet: fades with the same progress value. */
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  /** The sheet itself: rises into place and settles with a spring. */
  const sheetStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p,
      transform: [{ translateY: (1 - p) * SHEET_TRAVEL }, { scale: 0.97 + 0.03 * p }],
    };
  });

  // Load the user's preferred default duration when the modal opens
  useEffect(() => {
    if (visible) {
      getDefaultRestDurationMs().then((ms) => {
        // Keep the picker, countdown, and scheduled alert in agreement even if
        // a preference was stored outside the picker's range
        const clamped = Math.min(ms, (MAX_PICKER_MINUTES * 60 + MAX_PICKER_SECONDS) * 1000);
        setDurationMs(clamped);
        setRemainingMs(clamped);
        setRunning(false);
      });
    }
  }, [visible]);

  // Foreground re-sync: update UI when returning from background
  useTimeSync(() => {
    if (!running || endRef.current === 0) return;
    const left = endRef.current - Date.now();
    if (left <= 0) {
      setRemainingMs(0);
      setRunning(false);
    } else {
      setRemainingMs(left);
    }
  });

  // Countdown ticker for the UI.
  // The actual background alert is an OS-level notifee timestamp trigger
  // scheduled to fire at the same moment the countdown reaches zero.
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const left = endRef.current - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        setRunning(false);
        clearInterval(interval);
        cancelRestTimerNotification();
        // Countdown finished — buzz/vibrate so the user notices without
        // looking at the screen (local Vibration/Haptics only).
        triggerRestTimerFinishedAlert();
      } else {
        setRemainingMs(left);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [running]);

  // Shared helper: schedule the OS-level background alert for the given
  // seconds and remember its unique id so it can be cancelled precisely.
  const scheduleAlert = async (seconds: number) => {
    pendingNotificationIdRef.current = await scheduleRestTimerNotification(seconds);
  };

  const handleStart = () => {
    // The picker defines the exact target duration for this set
    const target = Math.max(1, Math.round(remainingMs / 1000));
    const end = Date.now() + target * 1000;
    endRef.current = end;
    setRunning(true);
    scheduleAlert(target);
  };

  const handlePause = () => {
    setRunning(false);
    cancelRestTimerNotification(pendingNotificationIdRef.current);
    pendingNotificationIdRef.current = null;
  };

  const handleRestart = () => {
    setRemainingMs(durationMs);
    setRunning(true);
    const end = Date.now() + durationMs;
    endRef.current = end;
    scheduleAlert(Math.max(1, Math.round(durationMs / 1000)));
  };

  const handleEnd = useCallback(() => {
    setRunning(false);
    cancelRestTimerNotification(pendingNotificationIdRef.current);
    pendingNotificationIdRef.current = null;
    onClose();
  }, [onClose]);

  const { minutes, seconds } = splitMs(remainingMs);

  // Changing a wheel retargets the duration for this set. The countdown is
  // locked while it runs, so a mid-rest change can never desync the alert.
  const handlePickMinutes = useCallback(
    (nextMinutes: number) => {
      const next = (nextMinutes * 60 + seconds) * 1000;
      setDurationMs(next);
      setRemainingMs(next);
    },
    [seconds]
  );

  const handlePickSeconds = useCallback(
    (nextSeconds: number) => {
      const next = (minutes * 60 + nextSeconds) * 1000;
      setDurationMs(next);
      setRemainingMs(next);
    },
    [minutes]
  );

  const canStart = remainingMs > 0;

  // Clean up if modal dismissed externally
  useEffect(() => {
    if (!visible) {
      setRunning(false);
      cancelRestTimerNotification(pendingNotificationIdRef.current);
      pendingNotificationIdRef.current = null;
    }
  }, [visible]);

  return (
    <Modal
      visible={mounted}
      // Reanimated owns the transition now (see the progress worklet above):
      // the platform's own fade would fight the worklet and stutter on Android.
      animationType="none"
      transparent
      onRequestClose={handleEnd}
    >
      <View style={styles.overlay}>
        <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
        <Animated.View style={[styles.card, sheetStyle]}>
          <Text style={styles.title}>Rest Timer</Text>

          {/* Countdown */}
          <Text style={[styles.countdown, remainingMs <= 0 && !running && styles.countdownDone]}>
            {formatMs(remainingMs)}
          </Text>

          {/* Target duration wheels (minutes 0-60 / seconds 0-59) */}
          <View style={styles.wheelRow}>
            <WheelColumn
              label="MIN"
              value={minutes}
              max={MAX_PICKER_MINUTES}
              disabled={running}
              onChange={handlePickMinutes}
              accessibilityLabel="rest minutes"
              testID="rest-minutes-wheel"
            />
            <WheelColumn
              label="SEC"
              value={seconds}
              max={MAX_PICKER_SECONDS}
              disabled={running}
              onChange={handlePickSeconds}
              accessibilityLabel="rest seconds"
              testID="rest-seconds-wheel"
            />
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            {running ? (
              <PressFeedback
                style={styles.controlBtn}
                contentStyle={styles.controlContent}
                onPress={handlePause}
                accessibilityLabel="Pause rest timer"
              >
                <Ionicons name="pause" size={18} color={COLORS.textPrimary} />
                <Text style={styles.controlText}>Pause</Text>
              </PressFeedback>
            ) : (
              <PressFeedback
                style={[
                  styles.controlBtn,
                  styles.controlPrimary,
                  !canStart && styles.controlDisabled,
                ]}
                contentStyle={styles.controlContent}
                onPress={handleStart}
                disabled={!canStart}
                accessibilityLabel="Start rest timer"
              >
                <Ionicons name="play" size={18} color={canStart ? '#09090b' : COLORS.textMuted} />
                <Text style={[styles.controlText, styles.controlTextPrimary, !canStart && styles.controlTextDisabled]}>
                  Start
                </Text>
              </PressFeedback>
            )}
            <PressFeedback
              style={styles.controlBtn}
              contentStyle={styles.controlContent}
              onPress={handleRestart}
              accessibilityLabel="Restart rest timer"
            >
              <Ionicons name="refresh" size={18} color={COLORS.textPrimary} />
              <Text style={styles.controlText}>Restart</Text>
            </PressFeedback>
            <PressFeedback
              style={[styles.controlBtn, styles.controlDanger]}
              contentStyle={styles.controlContent}
              onPress={handleEnd}
              accessibilityLabel="End rest timer"
            >
              <Ionicons name="stop" size={18} color={COLORS.accentRed} />
              <Text style={styles.controlTextDanger}>End</Text>
            </PressFeedback>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  // The dimmer is its own absolutely positioned layer so its animated opacity
  // cannot fade the sheet that sits on top of it.
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  countdown: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
    marginBottom: SPACING.md,
  },
  countdownDone: {
    color: COLORS.accentGreen,
  },
  wheelRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  wheelColumn: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  wheelColumnDisabled: {
    opacity: 0.6,
  },
  wheelLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  wheelViewport: {
    height: WHEEL_HEIGHT,
    width: '100%',
  },
  // Half a viewport minus half a row at both ends: the travel the first and the
  // last row need to reach the selection box. This is exactly the shift that
  // keeps `index * ITEM_HEIGHT` as the resting offset of row `index`.
  wheelContent: {
    paddingVertical: WHEEL_CENTER_TOP,
  },
  wheelList: {
    flex: 1,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
    // A line box exactly as tall as the row: the platform then splits the extra
    // leading evenly around the font's ascent/descent (RN's Android
    // `CustomLineHeightSpan` follows the CSS half-leading rule), so the digits
    // are centred by construction instead of by whatever metrics the device
    // font happens to have. Android's font ascent padding would skew them
    // upwards, hence it stays off.
    lineHeight: ITEM_HEIGHT,
    includeFontPadding: false,
  },
  wheelItemTextCentered: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  wheelItemTextIdle: {
    opacity: 0.35,
  },
  // Same `WHEEL_CENTER_TOP` as the content padding: a resting row's edges line
  // up with this box exactly (top, bottom and centre).
  wheelHighlight: {
    position: 'absolute',
    left: SPACING.sm,
    right: SPACING.sm,
    top: WHEEL_CENTER_TOP,
    height: ITEM_HEIGHT,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.accentGlow,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Layout of the button's contents lives on the animated wrapper that carries
  // the press transform.
  controlContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  controlPrimary: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  controlDisabled: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.border,
  },
  controlDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  controlText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  controlTextPrimary: {
    color: '#09090b',
    fontWeight: '700',
  },
  controlTextDisabled: {
    color: COLORS.textMuted,
  },
  controlTextDanger: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accentRed,
  },
});
