import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../utils/dateUtils';

export default function SplitSetupScreen() {
  const insets = useSafeAreaInsets();
  const { weeklySplit, muscleGroups, updateSplit, isLoading } = useAppStore();
  const [localSplit, setLocalSplit] = useState<Record<DayOfWeek, string[]>>(weeklySplit);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');

  // Ref mirror of localSplit so rapid checkbox taps always persist the latest state
  const localSplitRef = useRef(localSplit);
  useEffect(() => {
    localSplitRef.current = localSplit;
  }, [localSplit]);

  useEffect(() => {
    setLocalSplit(weeklySplit);
  }, [weeklySplit]);

  // Toggle a muscle group and persist the split immediately (auto-save)
  const toggleMuscleGroupForDay = (day: DayOfWeek, mgId: string) => {
    const prev = localSplitRef.current;
    const current = prev[day] || [];
    const exists = current.includes(mgId);
    const updatedDayMgs = exists
      ? current.filter((id) => id !== mgId)
      : [...current, mgId];
    const next = {
      ...prev,
      [day]: updatedDayMgs,
    };

    localSplitRef.current = next;
    setLocalSplit(next);

    // Instant persistence — no manual save button
    updateSplit(next).catch((err) => {
      console.error('Auto-save error (split):', err);
      Alert.alert('Error', 'Failed to auto-save weekly split schedule.');
    });
  };

  const activeDayMuscleGroups = localSplit[selectedDay] || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top header / back button are rendered by the navigator; only the
          subtitle lives in screen content (no duplicate "Routine Split" title). */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>Define target muscle groups for each day</Text>
      </View>

      {/* Day Selector Tabs */}
      <View style={styles.daySelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayScrollContent}
        >
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = day === selectedDay;
            const hasAssigned = (localSplit[day] || []).length > 0;
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayChip,
                  isSelected && styles.dayChipActive,
                  !isSelected && hasAssigned && styles.dayChipAssigned,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[
                    styles.dayChipText,
                    isSelected && styles.dayChipTextActive,
                  ]}
                >
                  {day.slice(0, 3)}
                </Text>
                {hasAssigned && (
                  <View
                    style={[
                      styles.indicatorDot,
                      isSelected && styles.indicatorDotActive,
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected Day Details */}
      <View style={styles.dayHeaderRow}>
        <Text style={styles.dayHeaderTitle}>{selectedDay}'s Focus</Text>
        <Text style={styles.dayHeaderCount}>
          {activeDayMuscleGroups.length} Muscle Group{activeDayMuscleGroups.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Muscle Group List Toggle */}
      <ScrollView
        style={styles.mgScroll}
        contentContainerStyle={[
          styles.mgListContent,
          // Keep the last rows (e.g. Triceps / Shoulders) fully scrollable
          // above the Android home/back navigation bar.
          { paddingBottom: insets.bottom + 30 },
        ]}
      >
        {muscleGroups.map((mg) => {
          const isSelected = activeDayMuscleGroups.includes(mg.id);
          return (
            <TouchableOpacity
              key={mg.id}
              style={[styles.mgCard, isSelected && styles.mgCardSelected]}
              onPress={() => toggleMuscleGroupForDay(selectedDay, mg.id)}
              activeOpacity={0.7}
            >
              <View style={styles.mgLeft}>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#09090b" />}
                </View>
                <Text style={[styles.mgName, isSelected && styles.mgNameSelected]}>
                  {mg.name}
                </Text>
              </View>
              {isSelected && (
                <View style={styles.assignedBadge}>
                  <Text style={styles.assignedBadgeText}>Assigned</Text>
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
  header: {
    paddingHorizontal: SPACING.lg,
    // Sit the subtitle immediately below the navigator header / back button
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 0,
  },
  daySelectorContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    paddingBottom: SPACING.sm,
  },
  dayScrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dayChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  dayChipAssigned: {
    borderColor: COLORS.borderLight,
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dayChipTextActive: {
    color: COLORS.bgPrimary,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentGreen,
  },
  indicatorDotActive: {
    backgroundColor: COLORS.bgPrimary,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  dayHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dayHeaderCount: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  mgScroll: {
    flex: 1,
  },
  mgListContent: {
    paddingHorizontal: SPACING.lg,
    gap: 10,
  },
  mgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mgCardSelected: {
    backgroundColor: COLORS.bgSecondary,
    borderColor: COLORS.accent,
  },
  mgLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  mgName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  mgNameSelected: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  assignedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  assignedBadgeText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
});
