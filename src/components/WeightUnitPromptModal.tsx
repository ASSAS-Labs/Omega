import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { WeightUnit } from '../services/weightUnitPrefs';

interface WeightUnitPromptModalProps {
  visible: boolean;
  onSelect: (unit: WeightUnit) => void;
}

/**
 * First-launch onboarding prompt: asks the user to choose KG or LBS before
 * they start logging. Cannot be dismissed without making a choice.
 */
export default function WeightUnitPromptModal({ visible, onSelect }: WeightUnitPromptModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="barbell-outline" size={30} color={COLORS.accentBlue} />
          </View>
          <Text style={styles.title}>Choose Your Weight Unit</Text>
          <Text style={styles.subtitle}>
            Pick the unit you use for logging weights. You can switch anytime in Settings.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.unitBtn, styles.unitBtnKg]}
              onPress={() => onSelect('kg')}
              activeOpacity={0.7}
            >
              <Text style={styles.unitBtnValue}>KG</Text>
              <Text style={styles.unitBtnHint}>Kilograms</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitBtn, styles.unitBtnLbs]}
              onPress={() => onSelect('lbs')}
              activeOpacity={0.7}
            >
              <Text style={styles.unitBtnValue}>LBS</Text>
              <Text style={styles.unitBtnHint}>Pounds</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: SPACING.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  unitBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  unitBtnKg: {
    backgroundColor: COLORS.bgSecondary,
    borderColor: COLORS.borderLight,
  },
  unitBtnLbs: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: COLORS.accentBlue,
  },
  unitBtnValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  unitBtnHint: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
