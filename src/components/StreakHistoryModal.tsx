import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../theme/colors';
import { EXIT_DURATION, SHEET_SPRING } from '../theme/motion';
import PressFeedback from './PressFeedback';
import { calculateAllStreaks, calculateWorkoutStreak, DAYS_OF_WEEK } from '../utils/dateUtils';
import { getCompletedWorkoutDates, getWeeklySplit } from '../services/database';

/** Number of ranked streak rows shown in the sheet. */
export const TOP_STREAK_COUNT = 5;

// ~72% of the screen height, so the sheet is comfortable on small devices while
// staying clearly modal on large ones.
const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.72);

interface StreakHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatStreakDays(days: number): string {
  return `${days} ${days === 1 ? 'Day' : 'Days'}`;
}

/**
 * Bottom sheet listing the five longest workout streaks ever recorded, ranked
 * highest first. Every figure comes from the logged sessions in the local
 * database — nothing is seeded — so the component loads its own data whenever
 * it becomes visible. Ranks with no history behind them are shown as vacant
 * slots, which is also what a brand new install sees.
 */
export default function StreakHistoryModal({ visible, onClose }: StreakHistoryModalProps) {
  const [streaks, setStreaks] = useState<number[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Native-thread open/close transition (see RestTimerModal for the pattern):
  // the sheet stays mounted for the length of the exit animation and both the
  // dimmer and the sheet are driven by one shared value, so only composite
  // properties (opacity + translateY) are animated — on the UI thread.
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
    // Unmounting is timer-driven so an interrupted animation can never leave
    // the sheet stuck on screen.
    const timer = setTimeout(() => setMounted(false), EXIT_DURATION);
    return () => clearTimeout(timer);
  }, [progress, visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  /** Slides up from off-screen; the travel is the sheet's own height. */
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * SHEET_HEIGHT }],
  }));

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    setLoading(true);
    Promise.all([getCompletedWorkoutDates(), getWeeklySplit()])
      .then(([dates, split]) => {
        if (cancelled) return;
        // Rest days must not end a run, so the sheet is measured with the same
        // split-aware rule the Dashboard badge and Analytics use.
        const scheduledDays = DAYS_OF_WEEK.filter((day) => (split[day] || []).length > 0);
        setStreaks(calculateAllStreaks(dates, scheduledDays));
        // The still-running streak, as the Dashboard/Analytics "Current Streak"
        // reports it: how many training days sit in the run that is alive today.
        setCurrentStreak(calculateWorkoutStreak(dates, undefined, scheduledDays));
      })
      .catch((err) => {
        console.error('Error loading streak history:', err);
        if (cancelled) return;
        setStreaks([]);
        setCurrentStreak(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Ranked board + the live run's place on it. Derived in one pass instead of
  // being recomputed inline while the sheet renders.
  const { topStreaks, positions, currentStreakRank, showsLiveRow } = useMemo(() => {
    const top = streaks.slice(0, TOP_STREAK_COUNT);
    // Ranked spot the live streak occupies, or -1 when it is too short to make
    // the board. `indexOf` resolves a tie to the highest of the tied places, so
    // a run level with a longer-standing best still gets labelled.
    const rank = currentStreak > 0 ? top.indexOf(currentStreak) : -1;
    return {
      topStreaks: top,
      positions: Array.from({ length: TOP_STREAK_COUNT }, (_, i) => i),
      currentStreakRank: rank,
      // A live run that missed the board still gets a row of its own: the header
      // badge shows it, so hiding it here would contradict that number.
      showsLiveRow: currentStreak > 0 && rank === -1,
    };
  }, [currentStreak, streaks]);

  return (
    <Modal
      visible={mounted}
      // Reanimated owns the transition (worklets above); the platform's own
      // slide would double up with it.
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Header: title left, close (X) top right */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Top 5 Streaks of All Time</Text>
              <Text style={styles.subtitle}>
                Days trained per unbroken streak, highest first
              </Text>
            </View>
            <PressFeedback
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Close streak history"
            >
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </PressFeedback>
          </View>

          <View style={styles.divider} />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={COLORS.accent} />
            </View>
          ) : (
            <View style={styles.rows}>
              {positions.map((index) => {
                const streakDays = topStreaks[index];
                const hasStreak = typeof streakDays === 'number';
                const isCurrent = index === currentStreakRank;

                return (
                  <View
                    key={index}
                    testID={`streak-row-${index + 1}`}
                    style={[styles.row, index === 0 && hasStreak && styles.rowHighlight]}
                  >
                    <View style={[styles.rankBadge, index === 0 && hasStreak && styles.rankBadgeTop]}>
                      <Text
                        style={[styles.rankText, index === 0 && hasStreak && styles.rankTextTop]}
                      >
                        {index + 1}
                      </Text>
                    </View>

                    {hasStreak ? (
                      <View style={styles.rowContent}>
                        <View style={styles.rowValueGroup}>
                          <Text style={styles.rowValue}>
                            #{index + 1} — {formatStreakDays(streakDays)}
                          </Text>
                          {isCurrent && (
                            <View style={styles.currentPill}>
                              <Text style={styles.currentPillText}>Current Streak</Text>
                            </View>
                          )}
                        </View>
                        {index === 0 && (
                          <Ionicons name="flame" size={16} color={COLORS.accentAmber} />
                        )}
                      </View>
                    ) : (
                      <Text style={styles.vacantText}>More streaks to come</Text>
                    )}
                  </View>
                );
              })}

              {/* The live run when it did not make the board, so the sheet always
                  shows the same streak the header badge does. */}
              {showsLiveRow && (
                <View testID="streak-current-row" style={[styles.row, styles.liveRow]}>
                  <View style={[styles.rankBadge, styles.liveBadge]}>
                    <Ionicons name="flame" size={14} color={COLORS.accentAmber} />
                  </View>
                  <View style={styles.rowValueGroup}>
                    <Text style={styles.rowValue}>{formatStreakDays(currentStreak)}</Text>
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>Current Streak</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  // Dimmer as its own layer: animating the overlay's own opacity would also fade
  // the sheet it contains.
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rows: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  rowHighlight: {
    borderColor: COLORS.accent,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgElevated,
  },
  rankBadgeTop: {
    backgroundColor: COLORS.accent,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  rankTextTop: {
    color: COLORS.bgPrimary,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowValueGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  // Marks the row that is the user's live run, as opposed to a personal best
  // from an earlier block.
  currentPill: {
    backgroundColor: COLORS.accentGreenGlow,
    borderWidth: 1,
    borderColor: COLORS.accentGreen,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: COLORS.accentGreen,
  },
  vacantText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  // The live run when it is too short to rank: a ranked row's shape, marked with
  // the flame and the current pill instead of a rank number.
  liveRow: {
    borderColor: COLORS.accentGreen,
  },
  liveBadge: {
    backgroundColor: COLORS.accentGreenGlow,
  },
});
