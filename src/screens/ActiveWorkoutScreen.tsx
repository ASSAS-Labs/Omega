import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { Exercise, WorkoutStackParamList } from '../types';
import * as db from '../services/database';
import {
  clearWorkoutDraft,
  getWorkoutDraft,
  saveWorkoutDraft,
} from '../services/workoutDraftService';
import { cancelRestTimerNotification } from '../services/notificationService';
import RestTimerModal from '../components/RestTimerModal';
import {
  convertWeight,
  formatWeight,
  roundWeight,
  toKg,
} from '../services/weightUnitPrefs';
import { useWeightUnit } from '../hooks/useWeightUnit';

// Enable smooth layout animations on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ActiveSetInput {
  setNumber: number;
  weight: string;
  reps: string;
}

interface ActiveExerciseLog {
  exercise: Exercise;
  previousSets: { setNumber: number; weight: number; reps: number }[];
  sets: ActiveSetInput[];
}

interface TemplateExerciseItem {
  exercise: Exercise;
  targetSets: number;
}

export default function ActiveWorkoutScreen() {
  const navigation = useNavigation<StackNavigationProp<WorkoutStackParamList>>();
  const route = useRoute<RouteProp<WorkoutStackParamList, 'ActiveWorkout'>>();
  const { date, day } = route.params;
  const weightUnit = useWeightUnit();
  // 'template' = Workout tab routine builder (no data input)
  // 'logging'  = Dashboard Start Workout (weight/reps entry)
  const mode = route.params.mode ?? 'logging';
  const isTemplateMode = mode === 'template';
  const isResume = route.params.resume === '1';

  const { weeklySplit, muscleGroups, allExercises } = useAppStore();

  const [exerciseLogs, setExerciseLogs] = useState<ActiveExerciseLog[]>([]);
  const [templateItems, setTemplateItems] = useState<TemplateExerciseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Delete mode state — toggled by the header "-" button
  const [isEditMode, setIsEditMode] = useState(false);

  // Exercise removal confirmation dialog state
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);

  // Exercise library picker state (template mode only)
  const [pickerVisible, setPickerVisible] = useState(false);

  // Rest timer modal state (logging mode only)
  const [restTimerVisible, setRestTimerVisible] = useState(false);

  // Crash-recovery draft: timestamp when the logging session started
  const draftStartedAtRef = useRef(Date.now());
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set once the session has been finalized ("Finish & Save Workout") so the
  // unmount-time flush can never resurrect the draft we just deleted.
  const finishedRef = useRef(false);

  // Hide the parent tab bar while logging a session; restore it on exit
  useEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      parent?.setOptions({
        tabBarStyle: {
          display: 'flex',
          backgroundColor: COLORS.bgSecondary,
          borderTopColor: COLORS.borderSubtle,
          borderTopWidth: 1,
        },
      });
    };
  }, [navigation]);

  // Header right actions:
  // template mode  -> "-" delete toggle + "+" library picker
  // logging mode   -> rest timer button
  useEffect(() => {
    if (isTemplateMode) {
      navigation.setOptions({
        headerRight: () => (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerIconButton, isEditMode && styles.headerIconButtonActive]}
              onPress={() => setIsEditMode((v) => !v)}
              accessibilityLabel="Toggle delete mode"
            >
              <Ionicons
                name="remove"
                size={24}
                color={isEditMode ? COLORS.accentRed : COLORS.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setPickerVisible(true)}
              accessibilityLabel="Add exercise from library"
            >
              <Ionicons name="add" size={24} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
        ),
      });
    } else {
      navigation.setOptions({
        headerRight: () => (
          // Same wrapper as template mode so the timer button gets a
          // balanced 16px margin from the right edge instead of sitting
          // flush against the screen border.
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setRestTimerVisible(true)}
              accessibilityLabel="Open rest timer"
            >
              <Ionicons name="timer-outline" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [navigation, isEditMode, isTemplateMode]);

  // Crash recovery: auto-save the logging session (debounced) as the user types.
  // Only persists once at least one set contains actual input.
  useEffect(() => {
    if (isTemplateMode) return;
    const hasInput = exerciseLogs.some((ex) =>
      ex.sets.some((s) => s.weight.trim() !== '' || s.reps.trim() !== '')
    );
    if (!hasInput) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveWorkoutDraft({
        date,
        day,
        dayName: route.params.dayName,
        startedAt: draftStartedAtRef.current,
        exerciseLogs,
      });
    }, 500);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [exerciseLogs, isTemplateMode, date, day, route.params.dayName]);

  // Ref mirror of the live session so an unmount-time flush can persist the
  // very latest input even if the 500ms debounce had not fired yet.
  const exerciseLogsRef = useRef(exerciseLogs);
  useEffect(() => {
    exerciseLogsRef.current = exerciseLogs;
  }, [exerciseLogs]);

  const flushDraftIfNeeded = () => {
    if (isTemplateMode || finishedRef.current) return;
    const logs = exerciseLogsRef.current;
    const hasInput = logs.some((ex) =>
      ex.sets.some((s) => s.weight.trim() !== '' || s.reps.trim() !== '')
    );
    if (!hasInput) return;
    saveWorkoutDraft({
      date,
      day,
      dayName: route.params.dayName,
      startedAt: draftStartedAtRef.current,
      exerciseLogs: logs,
    });
  };

  // Navigating back (without "Finish & Save") must keep the draft intact so
  // the parent screen can instantly offer Resume / Discard.
  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      flushDraftIfNeeded();
    };
  }, [date, day, route.params.dayName]);

  // Cancel any rest-timer notification when leaving the screen
  useEffect(() => {
    return () => {
      cancelRestTimerNotification();
    };
  }, []);

  useEffect(() => {
    loadWorkoutData();
  }, [date, day, mode]);

  const loadWorkoutData = async () => {
    setIsLoading(true);
    try {
      if (isTemplateMode) {
        await loadTemplateData();
      } else {
        await loadLoggingData();
      }
    } catch (err) {
      console.error('Error initializing active workout:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Template mode: load the day's routine template (exercises + target sets)
  const loadTemplateData = async () => {
    const template = await db.getDayTemplate(day);

    let items: TemplateExerciseItem[];
    if (template.length > 0) {
      items = template;
    } else {
      // Fallback: derive from the weekly split until a template is saved
      const assignedMgIds = weeklySplit[day] || [];
      const assignedMgNames = muscleGroups
        .filter((mg) => assignedMgIds.includes(mg.id))
        .map((mg) => mg.name);
      const exercises: Exercise[] =
        assignedMgNames.length > 0
          ? allExercises.filter((ex) => ex.muscleGroup && assignedMgNames.includes(ex.muscleGroup))
          : allExercises.slice(0, 6);
      items = exercises.map((ex) => ({ exercise: ex, targetSets: 3 }));
    }
    setTemplateItems(items);
  };

  // Logging mode: load the day's template (or split) with blank set rows ready for input.
  // When opened with `resume=1`, restore the exact crash-recovery draft instead.
  const loadLoggingData = async () => {
    if (isResume) {
      const draft = await getWorkoutDraft();
      if (draft) {
        draftStartedAtRef.current = draft.startedAt;
        setExerciseLogs(
          draft.exerciseLogs.map((d) => ({
            exercise: {
              id: d.exercise.id,
              name: d.exercise.name,
              muscleGroup: d.exercise.muscleGroup,
            },
            previousSets: d.previousSets,
            sets: d.sets.map((s) => ({ setNumber: s.setNumber, weight: s.weight, reps: s.reps })),
          }))
        );
        return;
      }
    }

    // A fresh session supersedes any stale draft
    await clearWorkoutDraft();
    draftStartedAtRef.current = Date.now();

    // 1. Check if workout is already logged for this date
    const existingLog = await db.getWorkoutLogForDate(date);
    const template = await db.getDayTemplate(day);

    const assignedMgIds = weeklySplit[day] || [];
    const assignedMgNames = muscleGroups
      .filter((mg) => assignedMgIds.includes(mg.id))
      .map((mg) => mg.name);

    // Determine exercises: exact template first, then split, then fallback
    let targetExercises: Exercise[] = [];
    if (template.length > 0) {
      targetExercises = template.map((t) => t.exercise);
    } else if (assignedMgNames.length > 0) {
      targetExercises = allExercises.filter(
        (ex) => ex.muscleGroup && assignedMgNames.includes(ex.muscleGroup)
      );
    } else {
      targetExercises = allExercises.slice(0, 6); // Default fall-back selection
    }

    // Prepare exercise logs structure with previous session references
    const logs: ActiveExerciseLog[] = [];

    for (const ex of targetExercises) {
      const prevSets = await db.getPreviousExerciseSets(ex.id);

      let initialSets: ActiveSetInput[] = [];

      if (existingLog) {
        const exSets = existingLog.sets.filter((s) => s.exerciseId === ex.id);
        if (exSets.length > 0) {
          initialSets = exSets.map((s) => ({
            setNumber: s.setNumber,
            // Stored weights are canonical kg; pre-fill in the active unit
            weight: String(roundWeight(convertWeight(s.weight, weightUnit))),
            reps: s.reps.toString(),
          }));
        }
      }

      // Blank/zeroed rows ready for logging; count from template target sets,
      // otherwise previous session length, otherwise a default of 3
      if (initialSets.length === 0) {
        const templateItem = template.find((t) => t.exercise.id === ex.id);
        const defaultCount = templateItem
          ? templateItem.targetSets
          : prevSets.length > 0
          ? prevSets.length
          : 3;
        for (let i = 1; i <= defaultCount; i++) {
          initialSets.push({
            setNumber: i,
            weight: '',
            reps: '',
          });
        }
      }

      logs.push({
        exercise: ex,
        previousSets: prevSets,
        sets: initialSets,
      });
    }

    setExerciseLogs(logs);
  };

  const handleUpdateSet = (
    exIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string
  ) => {
    setExerciseLogs((prev) => {
      const updated = [...prev];
      const targetEx = { ...updated[exIndex] };
      const updatedSets = [...targetEx.sets];
      updatedSets[setIndex] = {
        ...updatedSets[setIndex],
        [field]: value,
      };
      targetEx.sets = updatedSets;
      updated[exIndex] = targetEx;
      return updated;
    });
  };

  const handleRemoveSet = (exIndex: number, setIndex: number) => {
    setExerciseLogs((prev) => {
      const updated = [...prev];
      const targetEx = { ...updated[exIndex] };
      if (targetEx.sets.length <= 1) return prev; // keep at least 1 row

      const filtered = targetEx.sets.filter((_, idx) => idx !== setIndex);
      targetEx.sets = filtered.map((s, i) => ({ ...s, setNumber: i + 1 }));
      updated[exIndex] = targetEx;
      return updated;
    });
  };

  // Open the custom removal confirmation dialog for an exercise
  const handleRemoveExerciseRequest = (exIndex: number) => {
    setPendingDeleteIndex(exIndex);
  };

  const handleCancelRemoveExercise = () => {
    setPendingDeleteIndex(null);
  };

  // Confirm removal — removes the exercise from the session or template
  const handleConfirmRemoveExercise = () => {
    if (pendingDeleteIndex === null) return;
    const exIndex = pendingDeleteIndex;
    setPendingDeleteIndex(null);

    // Smooth removal animation; other cards keep their input state untouched
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isTemplateMode) {
      setTemplateItems((prev) => prev.filter((_, i) => i !== exIndex));
    } else {
      setExerciseLogs((prev) => prev.filter((_, i) => i !== exIndex));
    }
  };

  const pendingDeleteExercise =
    pendingDeleteIndex !== null
      ? isTemplateMode
        ? templateItems[pendingDeleteIndex]
        : exerciseLogs[pendingDeleteIndex]
      : null;

  // Template mode: add an exercise selected from the global library to the day's routine
  const handlePickExercise = (ex: Exercise) => {
    setTemplateItems((prev) => {
      if (prev.some((item) => item.exercise.id === ex.id)) return prev; // no duplicates
      return [...prev, { exercise: ex, targetSets: 3 }];
    });
    setPickerVisible(false);
  };

  // Template mode: adjust an exercise's target set count (clamped 1-10)
  const handleUpdateTargetSets = (exIndex: number, delta: number) => {
    setTemplateItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[exIndex] };
      item.targetSets = Math.min(10, Math.max(1, item.targetSets + delta));
      updated[exIndex] = item;
      return updated;
    });
  };

  // Template mode: persist the day's routine (exercises + target set counts)
  const handleSaveRoutine = async () => {
    try {
      await db.saveDayTemplate(
        day,
        templateItems.map((item) => ({
          exerciseId: item.exercise.id,
          targetSets: item.targetSets,
        }))
      );
      useAppStore.getState().notifyWorkoutSaved();
      navigation.goBack();
    } catch (err) {
      console.error('Save error (day routine):', err);
      Alert.alert('Error', 'Failed to save day routine.');
    }
  };

  const handleFinishWorkout = async () => {
    // Format sets payload
    const setsToSave: { exerciseId: string; setNumber: number; weight: number; reps: number }[] = [];

    for (const exLog of exerciseLogs) {
      for (const s of exLog.sets) {
        // Input is in the active unit; convert to canonical kg for storage
        const weightNum = toKg(parseFloat(s.weight) || 0, weightUnit);
        const repsNum = parseInt(s.reps, 10) || 0;

        if (repsNum > 0) {
          setsToSave.push({
            exerciseId: exLog.exercise.id,
            setNumber: s.setNumber,
            weight: weightNum,
            reps: repsNum,
          });
        }
      }
    }

    if (setsToSave.length === 0) {
      Alert.alert('No Sets Entered', 'Please fill in at least one set with reps > 0 to save workout.');
      return;
    }

    try {
      await db.saveWorkoutLog(date, day, '', setsToSave);
      // Finalize: mark the session as finished BEFORE purging the draft so
      // the unmount-time flush (which runs when we navigate away) can never
      // re-write the draft we are about to delete. Then stop the rest-timer
      // notification, permanently erase the crash-recovery draft (verified
      // inside clearWorkoutDraft), and only then reset the stack to the Days
      // Overview and return to the Dashboard tab.
      finishedRef.current = true;
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
      await clearWorkoutDraft();
      await cancelRestTimerNotification();
      useAppStore.getState().notifyWorkoutSaved();
      navigation.reset({ index: 0, routes: [{ name: 'WorkoutDays' }] });
      navigation.getParent()?.navigate('Dashboard' as never);
    } catch (err) {
      console.error('Save error (workout log):', err);
      Alert.alert('Error', 'Failed to save workout log.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Delete Mode Hint */}
      {isEditMode && (
        <View style={styles.editModeHint}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.accentRed} />
          <Text style={styles.editModeHintText}>
            Delete mode — tap the badge on an exercise to remove it
          </Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isTemplateMode ? (
          /* ---------------- Template Mode: Routine Builder (exercises + target sets) ---------------- */
          <>
            {templateItems.map((item, exIndex) => (
              <View
                key={item.exercise.id}
                style={[
                  styles.exerciseCard,
                  isEditMode && styles.exerciseCardEditMode,
                ]}
              >
                {/* Delete Badge (visible in edit mode) */}
                {isEditMode && (
                  <TouchableOpacity
                    style={styles.deleteBadge}
                    onPress={() => handleRemoveExerciseRequest(exIndex)}
                    hitSlop={8}
                    accessibilityLabel={`Remove ${item.exercise.name}`}
                  >
                    <Ionicons name="remove" size={16} color="#ffffff" />
                  </TouchableOpacity>
                )}

                {/* Exercise Card Header */}
                <View style={styles.exHeader}>
                  <View style={styles.exHeaderText}>
                    <Text style={styles.exName}>{item.exercise.name}</Text>
                    <Text style={styles.exMuscleGroup}>
                      {item.exercise.muscleGroup || 'Exercise'}
                    </Text>
                  </View>
                </View>

                {/* Target Sets Stepper */}
                <View style={styles.templateSetsRow}>
                  <Text style={styles.templateSetsLabel}>TARGET SETS</Text>
                  <View style={styles.templateStepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleUpdateTargetSets(exIndex, -1)}
                      accessibilityLabel={`Decrease target sets for ${item.exercise.name}`}
                    >
                      <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{item.targetSets}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleUpdateTargetSets(exIndex, 1)}
                      accessibilityLabel={`Increase target sets for ${item.exercise.name}`}
                    >
                      <Ionicons name="add" size={18} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </>
        ) : (
          /* ---------------- Logging Mode: Live Weight/Reps Entry ---------------- */
          exerciseLogs.map((exLog, exIndex) => {
          return (
            <View
              key={exLog.exercise.id}
              style={[
                styles.exerciseCard,
                isEditMode && styles.exerciseCardEditMode,
              ]}
            >
              {/* Delete Badge (visible in edit mode) */}
              {isEditMode && (
                <TouchableOpacity
                  style={styles.deleteBadge}
                  onPress={() => handleRemoveExerciseRequest(exIndex)}
                  hitSlop={8}
                  accessibilityLabel={`Remove ${exLog.exercise.name}`}
                >
                  <Ionicons name="remove" size={16} color="#ffffff" />
                </TouchableOpacity>
              )}

              {/* Exercise Card Header */}
              <View style={styles.exHeader}>
                <View>
                  <Text style={styles.exName}>{exLog.exercise.name}</Text>
                  <Text style={styles.exMuscleGroup}>{exLog.exercise.muscleGroup || 'Exercise'}</Text>
                </View>
              </View>

              {/* Previous Session Info Banner */}
              <View style={styles.prevSessionBox}>
                <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.prevSessionText}>
                  {exLog.previousSets.length > 0
                    ? `Prev: ${exLog.previousSets
                        .map((p) => `${formatWeight(p.weight, weightUnit)} × ${p.reps}`)
                        .join(' | ')}`
                    : 'Previous session: No historical data recorded'}
                </Text>
              </View>

              {/* Column Headers */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.colHeader, styles.colSet]}>SET</Text>
                <Text style={[styles.colHeader, styles.colPrev]}>PREVIOUS</Text>
                <Text style={[styles.colHeader, styles.colInput]}>
                  WEIGHT ({weightUnit.toUpperCase()})
                </Text>
                <Text style={[styles.colHeader, styles.colInput]}>REPS</Text>
                <View style={styles.colDelete} />
              </View>

              {/* Set Input Rows */}
              {exLog.sets.map((setRow, setIndex) => {
                const prevSet = exLog.previousSets.find((p) => p.setNumber === setRow.setNumber);
                const prevText = prevSet
                  ? `${formatWeight(prevSet.weight, weightUnit)} × ${prevSet.reps}`
                  : '-';

                return (
                  <View key={setRow.setNumber} style={styles.setRow}>
                    <Text style={[styles.cellText, styles.colSet]}>{setRow.setNumber}</Text>
                    <Text style={[styles.prevCellText, styles.colPrev]} numberOfLines={1}>
                      {prevText}
                    </Text>

                    <View style={styles.colInput}>
                      <TextInput
                        style={styles.numericInput}
                        keyboardType="numeric"
                        placeholder={
                          prevSet
                            ? String(roundWeight(convertWeight(prevSet.weight, weightUnit)))
                            : '0'
                        }
                        placeholderTextColor={COLORS.textMuted}
                        value={setRow.weight}
                        onChangeText={(val) => handleUpdateSet(exIndex, setIndex, 'weight', val)}
                      />
                    </View>

                    <View style={styles.colInput}>
                      <TextInput
                        style={styles.numericInput}
                        keyboardType="number-pad"
                        placeholder={prevSet ? prevSet.reps.toString() : '0'}
                        placeholderTextColor={COLORS.textMuted}
                        value={setRow.reps}
                        onChangeText={(val) => handleUpdateSet(exIndex, setIndex, 'reps', val)}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.colDelete}
                      onPress={() => handleRemoveSet(exIndex, setIndex)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          );
          })
        )}
      </ScrollView>

      {/* Footer Action Button */}
      <View style={styles.footer}>
        {isTemplateMode ? (
          <TouchableOpacity style={styles.finishButton} onPress={handleSaveRoutine}>
            <Ionicons name="save-outline" size={22} color="#09090b" />
            <Text style={styles.finishButtonText}>Save Day Routine</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.finishButton} onPress={handleFinishWorkout}>
            <Ionicons name="checkmark-done" size={22} color="#09090b" />
            <Text style={styles.finishButtonText}>Finish & Save Workout</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal: Add Exercise from Library (template mode) */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Add Exercise to Routine</Text>
            {allExercises.length === 0 ? (
              <View style={styles.pickerEmpty}>
                <Ionicons name="barbell-outline" size={26} color={COLORS.textMuted} />
                <Text style={styles.pickerEmptyText}>
                  Your exercise library is empty. Add exercises first in the Exercises tab.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.pickerList}>
                {allExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.pickerRow}
                    onPress={() => handlePickExercise(ex)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickerRowInfo}>
                      <Text style={styles.pickerRowName} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      {ex.muscleGroup ? (
                        <Text style={styles.pickerRowMg}>{ex.muscleGroup}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.pickerCloseBtn}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.pickerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Modal: Remove Exercise Confirmation */}
      <Modal
        visible={pendingDeleteIndex !== null}
        animationType="fade"
        transparent
        onRequestClose={handleCancelRemoveExercise}
      >        <View style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="trash-outline" size={22} color={COLORS.accentRed} />
            </View>
            <Text style={styles.confirmTitle}>
              {isTemplateMode ? 'Remove from Routine?' : 'Remove Exercise?'}
            </Text>
            <Text style={styles.confirmMessage}>
              "{pendingDeleteExercise?.exercise.name || 'This exercise'}" will be removed from
              {isTemplateMode
                ? ' this day\'s routine template.'
                : ' this workout. All of its sets will be cleared.'}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={handleCancelRemoveExercise}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmRemoveBtn}
                onPress={handleConfirmRemoveExercise}
              >
                <Ionicons name="trash-outline" size={16} color="#ffffff" />
                <Text style={styles.confirmRemoveText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rest Timer Modal (logging mode) */}
      {!isTemplateMode && (
        <RestTimerModal
          visible={restTimerVisible}
          onClose={() => setRestTimerVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 16,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerIconButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: COLORS.accentRed,
  },
  editModeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.25)',
  },
  editModeHintText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  exHeaderText: {
    flex: 1,
    paddingRight: 24,
  },
  templateSetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  templateSetsLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: COLORS.textMuted,
  },
  templateStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 14,
    paddingBottom: 120,
    gap: SPACING.lg,
  },
  exerciseCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exerciseCardEditMode: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  deleteBadge: {
    position: 'absolute',
    top: -10,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentRed,
    borderWidth: 2,
    borderColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  exHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingRight: 24,
  },
  exMuscleGroup: {
    fontSize: 12,
    color: COLORS.accentBlue,
    fontWeight: '600',
  },
  prevSessionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bgSecondary,
    padding: 8,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  prevSessionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  colSet: {
    width: 36,
    textAlign: 'center',
  },
  colPrev: {
    flex: 1,
    paddingHorizontal: 4,
  },
  colInput: {
    width: 80,
    alignItems: 'center',
  },
  colDelete: {
    width: 30,
    alignItems: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  cellText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  prevCellText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  numericInput: {
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    width: 72,
    paddingVertical: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 36,
    marginBottom: 16,
  },
  finishButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  finishButtonText: {
    color: '#09090b',
    fontSize: 16,
    fontWeight: '700',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '75%',
  },
  pickerHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.md,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  pickerList: {
    flexGrow: 0,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: 8,
  },
  pickerRowInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  pickerRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pickerRowMg: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  pickerEmpty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: SPACING.lg,
  },
  pickerEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  pickerCloseBtn: {
    marginTop: SPACING.sm,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
  confirmRemoveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accentRed,
  },
  confirmRemoveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
