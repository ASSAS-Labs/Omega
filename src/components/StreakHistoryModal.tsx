import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../theme/colors';
import { calculateAllStreaks } from '../utils/dateUtils';
import { getCompletedWorkoutDates } from '../services/database';

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
 * highest first. Streaks are derived from the locally stored workout logs, so
 * the component loads its own data whenever it becomes visible.
 */
export default function StreakHistoryModal({ visible, onClose }: StreakHistoryModalProps) {
  const [streaks, setStreaks] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    setLoading(true);
    getCompletedWorkoutDates()
      .then((dates) => {
        if (!cancelled) setStreaks(calculateAllStreaks(dates));
      })
      .catch((err) => {
        console.error('Error loading streak history:', err);
        if (!cancelled) setStreaks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const topStreaks = streaks.slice(0, TOP_STREAK_COUNT);
  const positions = Array.from({ length: TOP_STREAK_COUNT }, (_, i) => i);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header: title left, close (X) top right */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Top 5 Streaks of All Time</Text>
              <Text style={styles.subtitle}>
                Consecutive training days, highest first
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Close streak history"
            >
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
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

                return (
                  <View
                    key={index}
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
                        <Text style={styles.rowValue}>#{index + 1} — {formatStreakDays(streakDays)}</Text>
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
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
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
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  vacantText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
});
