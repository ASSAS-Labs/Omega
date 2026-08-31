import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import WorkoutDraftBanner from '../components/WorkoutDraftBanner';
import { DayOfWeek, WorkoutStackParamList } from '../types';
import { DAYS_OF_WEEK, getTodayDayOfWeek } from '../utils/dateUtils';
import * as db from '../services/database';

const EMPTY_COUNTS: Record<DayOfWeek, number> = {
  Monday: 0,
  Tuesday: 0,
  Wednesday: 0,
  Thursday: 0,
  Friday: 0,
  Saturday: 0,
  Sunday: 0,
};

export default function WorkoutDaysScreen() {
  const navigation = useNavigation<StackNavigationProp<WorkoutStackParamList>>();
  const { weeklySplit, muscleGroups, allExercises } = useAppStore();
  const todayDayOfWeek = getTodayDayOfWeek();
  const [templateCounts, setTemplateCounts] = useState<Record<DayOfWeek, number>>(EMPTY_COUNTS);

  // Reload template exercise counts whenever this screen regains focus
  // (e.g., after returning from the routine editor)
  useFocusEffect(
    useCallback(() => {
      db.getDayTemplateCounts()
        .then(setTemplateCounts)
        .catch((err) => console.error('Error loading template counts:', err));
    }, [])
  );

  const getDayInfo = (day: DayOfWeek) => {
    const mgIds = weeklySplit[day] || [];
    const mgNames = muscleGroups
      .filter((mg) => mgIds.includes(mg.id))
      .map((mg) => mg.name);
    // Fallback count: exercises whose muscleGroup matches one of the day's groups
    const splitCount = allExercises.filter(
      (ex) => ex.muscleGroup && mgNames.includes(ex.muscleGroup)
    ).length;
    // Prefer configured template count; fall back to split-derived count
    const exerciseCount = templateCounts[day] > 0 ? templateCounts[day] : splitCount;
    return { mgNames, exerciseCount };
  };

  const hasAnyTrainingDay = DAYS_OF_WEEK.some((d) => (weeklySplit[d] || []).length > 0);

  const handleSelectDay = (day: DayOfWeek) => {
    const { mgNames } = getDayInfo(day);
    const today = new Date().toISOString().split('T')[0];
    navigation.navigate('ActiveWorkout', {
      date: today,
      day,
      dayName: mgNames.length > 0 ? mgNames.join(' & ') : 'Rest Day',
      mode: 'template',
    });
  };

  const handleResumeDraft = (draft: { date: string; day: DayOfWeek; dayName?: string }) => {
    navigation.navigate('ActiveWorkout', {
      date: draft.date,
      day: draft.day,
      dayName: draft.dayName,
      mode: 'logging',
      resume: '1',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Crash-recovery banner: unfinalized workout draft */}
        <WorkoutDraftBanner onResume={handleResumeDraft} />

        {!hasAnyTrainingDay && (
          <View style={styles.emptyBanner}>
            <Ionicons name="calendar-outline" size={22} color={COLORS.textMuted} />
            <Text style={styles.emptyBannerText}>
              No training days configured yet. Set up your weekly split to see your workout days here.
            </Text>
          </View>
        )}

        {DAYS_OF_WEEK.map((day) => {
          const { mgNames, exerciseCount } = getDayInfo(day);
          const isTrainingDay = mgNames.length > 0;
          const isToday = day === todayDayOfWeek;

          return (
            <TouchableOpacity
              key={day}
              style={styles.dayCard}
              onPress={() => handleSelectDay(day)}
              activeOpacity={0.7}
            >
              <View style={styles.dayCardLeft}>
                <View style={styles.dayNameRow}>
                  <Text style={[styles.dayName, !isTrainingDay && styles.dayNameRest]}>
                    {day}
                  </Text>
                  {isToday && (
                    <View style={styles.todayPill}>
                      <Text style={styles.todayPillText}>TODAY</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.dayFocus, !isTrainingDay && styles.dayFocusRest]}
                  numberOfLines={1}
                >
                  {isTrainingDay ? mgNames.join(' & ') : 'Rest / Recovery'}
                </Text>
              </View>

              {isTrainingDay ? (
                <View style={styles.exerciseBadge}>
                  <Ionicons name="barbell-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.exerciseBadgeText}>
                    {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
                  </Text>
                </View>
              ) : (
                <View style={styles.restBadge}>
                  <Ionicons name="moon-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.restBadgeText}>Rest</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: 12,
  },
  emptyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: 4,
  },
  emptyBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  dayCardLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  dayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dayNameRest: {
    color: COLORS.textSecondary,
  },
  todayPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  todayPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.accentBlue,
  },
  dayFocus: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  dayFocusRest: {
    color: COLORS.textMuted,
  },
  exerciseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  exerciseBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  restBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
