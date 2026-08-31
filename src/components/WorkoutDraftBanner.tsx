import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import {
  WorkoutDraft,
  clearWorkoutDraft,
  getWorkoutDraft,
} from '../services/workoutDraftService';

interface WorkoutDraftBannerProps {
  onResume: (draft: WorkoutDraft) => void;
}

function formatElapsed(startedAt: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
  if (mins < 1) return 'just started';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * Top alert banner shown whenever an unfinalized workout draft exists:
 * "Workout in Progress — [Resume] | [Discard]".
 */
export default function WorkoutDraftBanner({ onResume }: WorkoutDraftBannerProps) {
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);

  // Re-check for an active draft every time the containing screen regains
  // focus (e.g. returning via the back button from an active workout), so
  // the banner appears instantly instead of waiting for a remount.
  useFocusEffect(
    useCallback(() => {
      getWorkoutDraft().then(setDraft).catch(() => setDraft(null));
    }, [])
  );

  const handleDiscard = async () => {
    await clearWorkoutDraft();
    setDraft(null);
  };

  if (!draft) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.bannerLeft}>
        <Ionicons name="pulse" size={18} color={COLORS.accentAmber} />
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Workout in Progress</Text>
          <Text style={styles.bannerSubtitle}>
            {draft.day} · {formatElapsed(draft.startedAt)} elapsed
          </Text>
        </View>
      </View>
      <View style={styles.bannerActions}>
        <TouchableOpacity style={styles.resumeBtn} onPress={() => onResume(draft)}>
          <Text style={styles.resumeText}>Resume</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
          <Text style={styles.discardText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: SPACING.sm,
  },
  resumeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  resumeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090b',
  },
  discardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  discardText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accentRed,
  },
});
