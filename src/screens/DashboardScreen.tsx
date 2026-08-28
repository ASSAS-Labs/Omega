import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { DayOfWeek, WorkoutLog } from '../types';
import { getWeekDates } from '../utils/dateUtils';
import * as db from '../services/database';
import { format, isSameDay } from 'date-fns';

interface DashboardScreenProps {
  onStartWorkout: (dateStr: string, dayOfWeek: DayOfWeek) => void;
  onNavigateSplitSetup: () => void;
}

export default function DashboardScreen({ onStartWorkout, onNavigateSplitSetup }: DashboardScreenProps) {
  const { weeklySplit, muscleGroups, refreshData, workoutSavedVersion } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [selectedDayLog, setSelectedDayLog] = useState<WorkoutLog | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  const weekDates = getWeekDates(new Date());

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
      const todayStr = new Date().toISOString().split('T')[0];
      const currentStr = selectedDateRef.current.toISOString().split('T')[0];
      if (todayStr !== currentStr) {
        refreshCurrentDateAndLogs();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshCurrentDateAndLogs]);

  const loadData = useCallback(async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
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

  useEffect(() => {
    loadData();
  }, [loadData, selectedDate, workoutSavedVersion]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    await loadData();
    setRefreshing(false);
  };

  // Delete the selected day's logged workout and revert the card to "Start Workout"
  const handleConfirmDelete = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      await db.deleteWorkoutLogForDate(dateStr);
      setConfirmDeleteVisible(false);
      // Bump version to trigger a dashboard reload (card reverts to active state)
      useAppStore.getState().notifyWorkoutSaved();
      await loadData();
    } catch (err) {
      console.error('Error deleting workout log:', err);
      setConfirmDeleteVisible(false);
    }
  };

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const dayIndex = selectedDate.getDay();
  const daysMap: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayOfWeek = daysMap[dayIndex];

  const assignedMgIds = weeklySplit[selectedDayOfWeek] || [];
  const assignedMgNames = muscleGroups
    .filter((mg) => assignedMgIds.includes(mg.id))
    .map((mg) => mg.name);

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
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={18} color={COLORS.accentAmber} />
            <Text style={styles.streakText}>{streak} Day Streak</Text>
          </View>
        </View>

        {/* Weekly Calendar Track View */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>This Week's Compliance</Text>
            <TouchableOpacity onPress={onNavigateSplitSetup}>
              <Text style={styles.editSplitLink}>Edit Split</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekDaysRow}>
            {weekDates.map((d) => {
              const dStr = d.toISOString().split('T')[0];
              const dayStr = daysMap[d.getDay()];
              const isSelected = isSameDay(d, selectedDate);
              const isCompleted = completedDates.has(dStr);
              const isScheduled = (weeklySplit[dayStr] || []).length > 0;
              const isCurrentDay = isSameDay(d, new Date());

              return (
                <TouchableOpacity
                  key={dStr}
                  style={[
                    styles.dayColumn,
                    isSelected && styles.dayColumnSelected,
                    isCurrentDay && !isSelected && styles.dayColumnToday,
                  ]}
                  onPress={() => setSelectedDate(d)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                    {format(d, 'EEE').slice(0, 2).toUpperCase()}
                  </Text>
                  <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                    {format(d, 'd')}
                  </Text>

                  {/* Compliance Indicator */}
                  <View style={styles.statusDotContainer}>
                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.accentGreen} />
                    ) : isScheduled ? (
                      <View style={[styles.scheduledDot, isSelected && styles.scheduledDotSelected]} />
                    ) : (
                      <View style={styles.restDot} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
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
                  onPress={() => setConfirmDeleteVisible(true)}
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
        {selectedDayLog && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Session Summary</Text>
            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatVal}>{selectedDayLog.sets.length}</Text>
                <Text style={styles.summaryStatLbl}>Total Sets</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatVal}>
                  {selectedDayLog.sets.reduce((acc, s) => acc + s.reps, 0)}
                </Text>
                <Text style={styles.summaryStatLbl}>Total Reps</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatVal}>
                  {Math.round(selectedDayLog.sets.reduce((acc, s) => acc + s.weight * s.reps, 0))} kg
                </Text>
                <Text style={styles.summaryStatLbl}>Volume</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal: Delete / Reset Completed Workout Confirmation */}
      <Modal
        visible={confirmDeleteVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setConfirmDeleteVisible(false)}
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
                onPress={() => setConfirmDeleteVisible(false)}
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
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  editSplitLink: {
    fontSize: 13,
    color: COLORS.accentBlue,
    fontWeight: '500',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  dayColumnSelected: {
    backgroundColor: COLORS.accent,
  },
  dayColumnToday: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  dayNameSelected: {
    color: COLORS.bgPrimary,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dayNumberSelected: {
    color: COLORS.bgPrimary,
  },
  statusDotContainer: {
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  scheduledDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textMuted,
  },
  scheduledDotSelected: {
    backgroundColor: COLORS.bgPrimary,
  },
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
    alignItems: 'flex-end',
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
    marginBottom: SPACING.sm,
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
    marginBottom: SPACING.lg,
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
