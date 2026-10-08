import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { useTimeSync } from '../hooks/useTimeSync';
import WorkoutDraftBanner from '../components/WorkoutDraftBanner';
import StreakHistoryModal from '../components/StreakHistoryModal';
import { DayOfWeek, WorkoutLog } from '../types';
import {
  getMonthCalendarGrid,
  formatMonthYear,
  WEEKDAY_INITIALS,
} from '../utils/dateUtils';
import * as db from '../services/database';
import { format, isSameDay } from 'date-fns';
import { convertWeight, roundWeight } from '../services/weightUnitPrefs';
import { useWeightUnit } from '../hooks/useWeightUnit';
import { formatISODate } from '../utils/dateUtils';

interface DashboardScreenProps {
  onStartWorkout: (dateStr: string, dayOfWeek: DayOfWeek) => void;
  onResumeWorkout: (dateStr: string, dayOfWeek: DayOfWeek) => void;
  onNavigateSplitSetup: () => void;
}

// Compliance marker geometry. Ionicons draws the checkmark-circle disc across
// 416 of its 512 glyph units, so the 13px tick that marks a logged day reads as
// a 10.56px circle. The missed badge is built at that same diameter, and its
// cross at the share of the disc the tick's own checkmark covers (Ionicons'
// `close` ink is 0.688em wide, so 7 gives ~46% of the circle) — the two
// outcomes then read as one marker in opposite colours.
const MARKER_ICON_SIZE = 13;
const MARKER_DIAMETER = (MARKER_ICON_SIZE * 416) / 512;
const MARKER_CROSS_SIZE = 7;

export default function DashboardScreen({
  onStartWorkout,
  onResumeWorkout,
  onNavigateSplitSetup,
}: DashboardScreenProps) {
  const weightUnit = useWeightUnit();
  const { weeklySplit, muscleGroups, refreshData, workoutSavedVersion, isLoading } =
    useAppStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [selectedDayLog, setSelectedDayLog] = useState<WorkoutLog | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [streakHistoryVisible, setStreakHistoryVisible] = useState(false);

  // Month grid for the compliance calendar: 4-6 Monday-first weekly rows
  const today = new Date();
  const todayStr = formatISODate(today);
  const monthGrid = getMonthCalendarGrid(today);

  // Keep a ref of the currently shown date so the midnight checker can compare
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // Re-evaluate the clock + reload logs when the app returns to the foreground
  const refreshCurrentDateAndLogs = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  useTimeSync(refreshCurrentDateAndLogs);

  // Foreground midnight rollover: if the date changed while the app stayed
  // open, jump to today and refresh
  useEffect(() => {
    const interval = setInterval(() => {
      const todayStr = formatISODate(new Date());
      const currentStr = formatISODate(selectedDateRef.current);
      if (todayStr !== currentStr) {
        refreshCurrentDateAndLogs();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshCurrentDateAndLogs]);

  const loadData = useCallback(async () => {
    try {
      const dateStr = formatISODate(selectedDate);
      const [log, complianceStats] = await Promise.all([
        db.getWorkoutLogForDate(dateStr),
        db.getComplianceStats(30),
      ]);

      setSelectedDayLog(log);
      setStreak(complianceStats.streak);

      // Load all completed dates in current week view
      const dbInstance = await db.getDB();
      const logs = await dbInstance.getAllAsync<{ date: string }>(
        'SELECT DISTINCT date FROM workout_logs WHERE completed = 1;'
      );
      setCompletedDates(new Set(logs.map((l) => l.date)));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  }, [selectedDate]);

  // The screen's reads only start once the store has finished initializing.
  // `initStore` is what opens the shared connection, applies its pragmas, builds
  // or repairs the schema and seeds the muscle groups — all of that runs as
  // writes on the same connection, so a dashboard query issued during that
  // window contends with schema setup and surfaces as `database is locked`.
  useEffect(() => {
    if (isLoading) return;
    loadData();
  }, [isLoading, loadData, selectedDate, workoutSavedVersion]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    await loadData();
    setRefreshing(false);
  }, [loadData, refreshData]);

  // Delete the selected day's logged workout and revert the card to "Start Workout"
  const handleConfirmDelete = useCallback(async () => {
    try {
      const dateStr = formatISODate(selectedDate);
      await db.deleteWorkoutLogForDate(dateStr);
      setConfirmDeleteVisible(false);
      // Bump version to trigger a dashboard reload (card reverts to active state)
      useAppStore.getState().notifyWorkoutSaved();
      await loadData();
    } catch (err) {
      console.error('Error deleting workout log:', err);
      setConfirmDeleteVisible(false);
    }
  }, [loadData, selectedDate]);

  const handleOpenStreakHistory = useCallback(() => setStreakHistoryVisible(true), []);
  const handleCloseStreakHistory = useCallback(() => setStreakHistoryVisible(false), []);
  const handleOpenDeleteConfirm = useCallback(() => setConfirmDeleteVisible(true), []);
  const handleCloseDeleteConfirm = useCallback(() => setConfirmDeleteVisible(false), []);

  const selectedDateStr = useMemo(() => formatISODate(selectedDate), [selectedDate]);
  const dayIndex = selectedDate.getDay();
  const daysMap: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayOfWeek = daysMap[dayIndex];

  const assignedMgNames = useMemo(() => {
    const assignedMgIds = weeklySplit[selectedDayOfWeek] || [];
    return muscleGroups.filter((mg) => assignedMgIds.includes(mg.id)).map((mg) => mg.name);
  }, [muscleGroups, selectedDayOfWeek, weeklySplit]);

  /**
   * Session totals for the selected day: the reps sum and the volume
   * (Σ weight × reps) both walk every logged set, so they are derived once per
   * log/unit change instead of on every render of the dashboard.
   */
  const sessionTotals = useMemo(() => {
    if (!selectedDayLog) return null;
    let totalReps = 0;
    let totalVolume = 0;
    for (const s of selectedDayLog.sets) {
      totalReps += s.reps;
      totalVolume += s.weight * s.reps;
    }
    return {
      totalSets: selectedDayLog.sets.length,
      totalReps,
      // Stored weights are canonical kg; the summary shows the active unit
      volume: roundWeight(convertWeight(totalVolume, weightUnit)),
    };
  }, [selectedDayLog, weightUnit]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        {/* Top App Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>OMEGA</Text>
          <TouchableOpacity
            style={styles.streakBadge}
            onPress={handleOpenStreakHistory}
            activeOpacity={0.7}
            accessibilityLabel="View top streaks"
            accessibilityRole="button"
          >
            <Ionicons name="flame" size={18} color={COLORS.accentAmber} />
            <Text style={styles.streakText}>{streak} Day Streak</Text>
          </TouchableOpacity>
        </View>

        {/* Crash-recovery banner: unfinalized workout draft */}
        <WorkoutDraftBanner
          onResume={(draft) => onResumeWorkout(draft.date, draft.day)}
        />

        {/* Monthly Compliance Calendar */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>{formatMonthYear(today)}</Text>
            <TouchableOpacity onPress={onNavigateSplitSetup}>
              <Text style={styles.editSplitLink}>Edit Split</Text>
            </TouchableOpacity>
          </View>

          {/* Weekday column initials (Monday first) */}
          <View style={styles.weekdayRow}>
            {WEEKDAY_INITIALS.map((initial) => (
              <Text key={initial} style={styles.weekdayInitial}>
                {initial}
              </Text>
            ))}
          </View>

          {/* One row per week; slots outside the month stay empty */}
          {monthGrid.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} testID={`month-week-${weekIndex}`} style={styles.weekRow}>
              {week.map((day, weekdayIndex) => {
                if (!day) {
                  return <View key={`blank-${weekIndex}-${weekdayIndex}`} style={styles.dayCell} />;
                }

                const dStr = formatISODate(day);
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, today);
                const isCompleted = completedDates.has(dStr);
                const isScheduled = (weeklySplit[daysMap[day.getDay()]] || []).length > 0;
                // A scheduled day that has already passed with nothing logged.
                // Today is never a miss — it is still open.
                const isMissed = isScheduled && !isCompleted && dStr < todayStr;
                const dayLabel = format(day, 'MMMM d');

                return (
                  <TouchableOpacity
                    key={dStr}
                    testID={`month-day-${dStr}`}
                    style={styles.dayCell}
                    onPress={() => setSelectedDate(day)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${dayLabel}, ${
                      isCompleted
                        ? 'workout logged'
                        : isMissed
                        ? 'workout missed'
                        : isScheduled
                        ? 'workout due'
                        : 'rest day'
                    }`}
                  >
                    <View
                      style={[
                        styles.dayNumberPill,
                        isToday && styles.dayNumberToday,
                        isSelected && styles.dayNumberSelected,
                      ]}
                    >
                      <Text
                        style={[styles.dayNumberText, isSelected && styles.dayNumberTextSelected]}
                      >
                        {format(day, 'd')}
                      </Text>
                    </View>

                    {/* Compliance marker. Every state renders inside the same
                        fixed-height slot, so the ticks and the dots share one
                        centre line and rows keep an even height. */}
                    <View style={styles.dayMarkerSlot}>
                      {isCompleted ? (
                        <Ionicons
                          testID={`month-day-check-${dStr}`}
                          name="checkmark-circle"
                          size={MARKER_ICON_SIZE}
                          color={COLORS.accentGreen}
                        />
                      ) : isMissed ? (
                        <View testID={`month-day-missed-${dStr}`} style={styles.missedBadge}>
                          <Ionicons name="close" size={MARKER_CROSS_SIZE} color="#ffffff" />
                        </View>
                      ) : isScheduled ? (
                        <View testID={`month-day-due-${dStr}`} style={styles.pendingDot} />
                      ) : (
                        <View testID={`month-day-rest-${dStr}`} style={styles.restDot} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Selected Date Focus Card */}
        <View style={styles.routineCard}>
          {/* Row 1: day label + status badge / delete button */}
          <View style={styles.routineHeaderRow}>
            <Text style={styles.targetDayLabel}>{selectedDayOfWeek.toUpperCase()}</Text>
            <View style={styles.routineTopRight}>
              <View style={[styles.statusTag, selectedDayLog ? styles.statusCompleted : assignedMgNames.length > 0 ? styles.statusScheduled : styles.statusRest]}>
                <Text style={styles.statusTagText}>
                  {selectedDayLog ? 'COMPLETED' : assignedMgNames.length > 0 ? 'WORKOUT DAY' : 'REST'}
                </Text>
              </View>
              {/* Compact circular delete button, only on completed days */}
              {selectedDayLog && (
                <TouchableOpacity
                  style={styles.deleteLogBtn}
                  onPress={handleOpenDeleteConfirm}
                  hitSlop={6}
                  accessibilityLabel="Delete workout"
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.accentRed} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Row 2: muscle groups title (wraps instead of overflowing) */}
          <Text style={styles.targetSplitName} numberOfLines={2}>
            {assignedMgNames.length > 0
              ? assignedMgNames.join(' & ')
              : 'Rest / Active Recovery Day'}
          </Text>

          {assignedMgNames.length > 0 && (
            <View style={styles.targetPillsRow}>
              {assignedMgNames.map((mgName) => (
                <View key={mgName} style={styles.targetPill}>
                  <Text style={styles.targetPillText}>{mgName}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.startWorkoutButton,
              selectedDayLog && styles.viewWorkoutButton,
              assignedMgNames.length === 0 && styles.buttonTopSpacer,
            ]}
            onPress={() => onStartWorkout(selectedDateStr, selectedDayOfWeek)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={selectedDayLog ? 'eye-outline' : 'barbell-outline'}
              size={20}
              color={selectedDayLog ? COLORS.textPrimary : COLORS.bgPrimary}
            />
            <Text
              style={[
                styles.startWorkoutText,
                selectedDayLog && styles.viewWorkoutText,
              ]}
            >
              {selectedDayLog
                ? 'View Logged Workout'
                : assignedMgNames.length > 0
                ? 'Start Workout'
                : 'Log Optional Workout'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Summary / Summary stats for selected date if logged */}
        {selectedDayLog && sessionTotals && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Session Summary</Text>
            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatVal}>{sessionTotals.totalSets}</Text>
                <Text style={styles.summaryStatLbl}>Total Sets</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatVal}>{sessionTotals.totalReps}</Text>
                <Text style={styles.summaryStatLbl}>Total Reps</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatVal}>
                  {sessionTotals.volume} {weightUnit}
                </Text>
                <Text style={styles.summaryStatLbl}>Volume</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Streak history sheet: top 5 streaks of all time */}
      <StreakHistoryModal
        visible={streakHistoryVisible}
        onClose={handleCloseStreakHistory}
      />

      {/* Modal: Delete / Reset Completed Workout Confirmation */}
      <Modal
        visible={confirmDeleteVisible}
        animationType="fade"
        transparent
        onRequestClose={handleCloseDeleteConfirm}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="trash-outline" size={22} color={COLORS.accentRed} />
            </View>
            <Text style={styles.confirmTitle}>Delete Completed Session?</Text>
            <Text style={styles.confirmMessage}>
              This will clear {format(selectedDate, 'MMM d')}'s logged data and revert this day
              to a fresh workout.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={handleCloseDeleteConfirm}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={handleConfirmDelete}>
                <Ionicons name="trash-outline" size={16} color="#ffffff" />
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 40,
    paddingBottom: SPACING.xxl,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  calendarCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 0,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  editSplitLink: {
    fontSize: 13,
    color: COLORS.accentBlue,
    fontWeight: '500',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    marginBottom: 4,
  },
  weekdayInitial: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: COLORS.textMuted,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    gap: 2,
  },
  dayNumberPill: {
    minWidth: 26,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    // Reserved on every cell so rows keep an even height, and so today's ring
    // stays visible even when today is also the selected day
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayNumberToday: {
    borderColor: COLORS.accentBlue,
  },
  dayNumberSelected: {
    backgroundColor: COLORS.accent,
  },
  dayNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dayNumberTextSelected: {
    color: COLORS.bgPrimary,
    fontWeight: '700',
  },
  // Every marker renders inside this slot: one shared height and centre line, so
  // the tick and the dots sit on the same axis and rows never change height
  // depending on what a day happens to show.
  dayMarkerSlot: {
    height: MARKER_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Missed day: the tick's own circle at the tick's own diameter, red with a
  // white cross instead of green with a checkmark.
  missedBadge: {
    width: MARKER_DIAMETER,
    height: MARKER_DIAMETER,
    borderRadius: MARKER_DIAMETER / 2,
    backgroundColor: COLORS.accentRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Day the split schedules that is still open (today and the days after it). */
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textMuted,
  },
  /** Rest day: nothing expected, so the faintest possible marker. */
  restDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  routineCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    // Clear breathing room below the compliance calendar
    marginTop: 24,
    marginBottom: 20,
    overflow: 'hidden',
  },
  routineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  routineTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  targetDayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  targetSplitName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
    flexWrap: 'wrap',
    marginBottom: 0,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusScheduled: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  statusRest: {
    backgroundColor: COLORS.bgElevated,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
  },
  targetPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 12,
  },
  targetPill: {
    backgroundColor: COLORS.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  targetPillText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  startWorkoutButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonTopSpacer: {
    marginTop: 12,
  },
  viewWorkoutButton: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  startWorkoutText: {
    color: COLORS.bgPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  viewWorkoutText: {
    color: COLORS.textPrimary,
  },
  deleteLogBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  confirmIconCircle: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accentRed,
  },
  confirmDeleteText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  summaryBox: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatVal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryStatLbl: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  summaryStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
});
