import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { RootStackParamList } from '../types';
import {
  getDefaultRestDurationMs,
  setDefaultRestDurationMs,
  formatRestDuration,
} from '../services/restTimerPrefs';
import { exportBackup, pickAndImportBackup } from '../services/backupService';
import {
  saveWeightUnit,
  WeightUnit,
} from '../services/weightUnitPrefs';
import { useWeightUnit } from '../hooks/useWeightUnit';

const MAX_MINUTES = 59;
const MAX_SECONDS = 59;

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const weightUnit = useWeightUnit();

  const [restTimerMs, setRestTimerMs] = useState<number>(60000);
  const [restModalVisible, setRestModalVisible] = useState(false);
  const [restMinutesText, setRestMinutesText] = useState('1');
  const [restSecondsText, setRestSecondsText] = useState('0');
  const [isBusy, setIsBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getDefaultRestDurationMs().then(setRestTimerMs).catch(() => {});
    }, [])
  );

  const openRestModal = () => {
    const totalSec = Math.max(0, Math.round(restTimerMs / 1000));
    setRestMinutesText(String(Math.min(MAX_MINUTES, Math.floor(totalSec / 60))));
    setRestSecondsText(String(totalSec % 60));
    setRestModalVisible(true);
  };

  /** Keeps a numeric TextInput value to digits only, max 2 chars, clamped. */
  const sanitizeNumberInput = (raw: string, max: number): string => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 2);
    if (digits === '') return '';
    return String(Math.min(max, parseInt(digits, 10)));
  };

  const handleMinutesChange = (raw: string) => {
    setRestMinutesText(sanitizeNumberInput(raw, MAX_MINUTES));
  };

  // Seconds above 59 clamp to 59 (graceful, predictable behavior)
  const handleSecondsChange = (raw: string) => {
    setRestSecondsText(sanitizeNumberInput(raw, MAX_SECONDS));
  };

  const minutesValue = restMinutesText === '' ? 0 : parseInt(restMinutesText, 10);
  const secondsValue = restSecondsText === '' ? 0 : parseInt(restSecondsText, 10);
  const totalRestSec = minutesValue * 60 + secondsValue;
  const canSave = totalRestSec >= 1;

  const handleSaveRestDuration = async () => {
    if (!canSave) return;
    const ms = totalRestSec * 1000;
    setRestTimerMs(ms);
    await setDefaultRestDurationMs(ms);
    setRestModalVisible(false);
  };

  const handleExport = async () => {
    setIsBusy(true);
    try {
      await exportBackup();
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export backup.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = async () => {
    setIsBusy(true);
    try {
      const sets = await pickAndImportBackup();
      Alert.alert('Import Complete', `Backup restored successfully (${sets} logged sets).`);
    } catch (err: any) {
      if (err?.message !== 'Import cancelled.') {
        Alert.alert('Import Failed', err?.message || 'Could not import backup.');
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Section 1: Routine Split */}
        <Text style={styles.sectionLabel}>ROUTINE</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('SplitSetup')}
          activeOpacity={0.7}
        >
          <View style={[styles.rowIcon, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.accentBlue} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Routine Split</Text>
            <Text style={styles.rowSubtitle}>Configure muscle groups for each day</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Section 2: Rest Timer Preference */}
        <Text style={styles.sectionLabel}>TIMER</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={openRestModal}
          activeOpacity={0.7}
        >
          <View style={[styles.rowIcon, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Ionicons name="timer-outline" size={20} color={COLORS.accentAmber} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Default Rest Timer</Text>
            <Text style={styles.rowSubtitle}>{formatRestDuration(restTimerMs)} between sets</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Section 3: Weight Unit Preference */}
        <Text style={styles.sectionLabel}>UNITS</Text>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
            <Ionicons name="scale-outline" size={20} color={COLORS.accentBlue} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Weight Unit</Text>
            <Text style={styles.rowSubtitle}>
              Display weights in {weightUnit === 'kg' ? 'kilograms (kg)' : 'pounds (lbs)'}
            </Text>
          </View>
          <View style={styles.unitToggle}>
            {(['kg', 'lbs'] as WeightUnit[]).map((u) => {
              const isActive = weightUnit === u;
              return (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, isActive && styles.unitChipActive]}
                  onPress={() => saveWeightUnit(u)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Use ${u.toUpperCase()} weights`}
                >
                  <Text style={[styles.unitChipText, isActive && styles.unitChipTextActive]}>
                    {u.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 4: Data Backup & Portability */}
        <Text style={styles.sectionLabel}>DATA</Text>
        <TouchableOpacity style={styles.row} onPress={handleExport} disabled={isBusy} activeOpacity={0.7}>
          <View style={[styles.rowIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
            <Ionicons name="share-outline" size={20} color={COLORS.accentGreen} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Export Backup</Text>
            <Text style={styles.rowSubtitle}>Share all data as a JSON file</Text>
          </View>
          {isBusy ? (
            <ActivityIndicator size="small" color={COLORS.textMuted} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={handleImport} disabled={isBusy} activeOpacity={0.7}>
          <View style={[styles.rowIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
            <Ionicons name="cloud-upload-outline" size={20} color={COLORS.accentRed} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Import Backup</Text>
            <Text style={styles.rowSubtitle}>Restore data from a JSON file</Text>
          </View>
          {isBusy ? (
            <ActivityIndicator size="small" color={COLORS.textMuted} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Rest Timer Preference Modal — custom user-defined duration */}
      <Modal
        visible={restModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setRestModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Default Rest Timer</Text>
            <Text style={styles.modalSubtitle}>Set your exact rest duration between sets</Text>

            <View style={styles.timePickerRow}>
              {/* Minutes input */}
              <TextInput
                style={styles.timeInput}
                value={restMinutesText}
                onChangeText={handleMinutesChange}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="01"
                placeholderTextColor={COLORS.textDisabled}
                selectTextOnFocus
                accessibilityLabel="Rest duration minutes"
              />

              <Text style={styles.timeColon}>:</Text>

              {/* Seconds input */}
              <TextInput
                style={styles.timeInput}
                value={restSecondsText}
                onChangeText={handleSecondsChange}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="00"
                placeholderTextColor={COLORS.textDisabled}
                selectTextOnFocus
                accessibilityLabel="Rest duration seconds"
              />
            </View>

            <View style={styles.modalPreview}>
              <Text style={styles.modalPreviewText}>{formatRestDuration(totalRestSec * 1000)}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRestModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, !canSave && styles.modalSaveBtnDisabled]}
                onPress={handleSaveRestDuration}
                disabled={!canSave}
              >
                <Text style={styles.modalSaveText}>Save</Text>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 40,
    paddingBottom: SPACING.xxl,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: 10,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
    gap: 2,
  },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  unitChipActive: {
    backgroundColor: COLORS.accent,
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  unitChipTextActive: {
    color: '#09090b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.lg,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    width: '100%',
    // Bounded inside the modal card — inputs never bleed past its padding
    paddingHorizontal: SPACING.xs,
  },
  timeInput: {
    width: 72,
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: 8,
    paddingHorizontal: 0,
    fontVariant: ['tabular-nums'],
  },
  timeColon: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  modalPreview: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  modalPreviewText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accentAmber,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
  },
  modalSaveBtnDisabled: {
    opacity: 0.4,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#09090b',
  },
});
