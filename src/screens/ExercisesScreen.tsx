import React, { useCallback, useState } from 'react';
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
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { Exercise, RootTabParamList } from '../types';
import { EXERCISE_POOL, PoolExercise } from '../constants/exercisePool';
import * as db from '../services/database';
import * as Haptics from 'expo-haptics';

export default function ExercisesScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { muscleGroups, allExercises, refreshData, addExercise } = useAppStore();

  // Pool search modal state
  const [poolVisible, setPoolVisible] = useState(false);
  const [poolQuery, setPoolQuery] = useState('');

  // Add-custom modal state
  const [customVisible, setCustomVisible] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [selectedMg, setSelectedMg] = useState<string>(muscleGroups[0]?.name || '');
  const [isAdding, setIsAdding] = useState(false);

  // Confirmation banner (transient)
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  // Themed "save to a workout day" prompt target (name of the just-added exercise)
  const [savePrompt, setSavePrompt] = useState<{ name: string; muscleGroup: string } | null>(null);

  // Edit state
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editName, setEditName] = useState('');
  const [editMg, setEditMg] = useState('');

  // Delete confirmation state
  const [pendingDelete, setPendingDelete] = useState<Exercise | null>(null);

  // Keep the library in sync whenever this tab gains focus
  useFocusEffect(
    useCallback(() => {
      refreshData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Which pool items are already in the user's library (case-insensitive)?
  const existingByName: Set<string> = new Set(
    allExercises.map((e) => e.name.toLowerCase().trim())
  );

  const isPoolItemAdded = (name: string) => existingByName.has(name.toLowerCase().trim());

  const flashNotice = (msg: string) => {
    setAddedNotice(msg);
    setTimeout(() => setAddedNotice(null), 2200);
  };

  // After any exercise is added, surface a themed dialog reminding the user it
  // must be saved to a specific day in the Workout tab (saved routines don't
  // auto-import new library entries). The dialog is rendered below in the app's
  // dark theme instead of the default native (white) alert.
  const promptSaveThisToDay = (exercise: { name: string; muscleGroup: string }) => {
    setSavePrompt({ name: exercise.name, muscleGroup: exercise.muscleGroup || 'General' });
  };

  const closeSavePrompt = () => setSavePrompt(null);

  const handleGoToWorkout = () => {
    setSavePrompt(null);
    navigation.navigate('Workout');
  };

  const handleAddFromPool = async (poolEx: PoolExercise) => {
    if (isPoolItemAdded(poolEx.name)) {
      flashNotice(`"${poolEx.name}" is already in your library`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    try {
      await addExercise(poolEx.name, poolEx.muscleGroup);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      flashNotice(`Added "${poolEx.name}"`);
      promptSaveThisToDay(poolEx);
      // Keep modal open so the user can add several in a row; row flips to "Added".
    } catch (err: any) {
      if (err?.message === 'EXERCISE_EXISTS') {
        flashNotice(`"${poolEx.name}" is already in your library`);
      } else {
        console.warn('Failed to add from pool:', err);
        Alert.alert('Error', 'Failed to add exercise.');
      }
    }
  };

  const normalize = (s: string) => s.trim().toLowerCase();

  // Filter + group the pool by muscle group for display, respecting the query.
  const normalizedQuery = normalize(poolQuery);
  const filteredPool = EXERCISE_POOL.filter((e) =>
    !normalizedQuery ? true : normalize(e.name).includes(normalizedQuery)
  );

  const poolSections = (() => {
    const grouped: Record<string, PoolExercise[]> = {};
    for (const ex of filteredPool) {
      const key = ex.muscleGroup || 'Other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ex);
    }
    // Render in the canonical 9-group order (Chest → Back → Shoulders →
    // Biceps → Triceps → Forearms → Legs → Calves → Abs & Core), matching the
    // app's defined categories, instead of alphabetical. Any unmatched/'Other'
    // bucket (defensive only) is appended at the end.
    const canonicalOrder = [
      'Chest',
      'Back',
      'Shoulders',
      'Biceps',
      'Triceps',
      'Forearms',
      'Legs',
      'Calves',
      'Abs & Core',
    ];
    return Object.entries(grouped)
      .sort(([a], [b]) => {
        const ia = canonicalOrder.indexOf(a);
        const ib = canonicalOrder.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
      .map(([title, data]) => ({ title, data }));
  })();

  const openCustom = () => {
    setNewExName('');
    setSelectedMg(muscleGroups[0]?.name || '');
    setCustomVisible(true);
  };

  const handleAddCustom = async () => {
    if (!newExName.trim()) {
      Alert.alert('Missing Name', 'Please enter an exercise name.');
      return;
    }
    setIsAdding(true);
    try {
      await addExercise(newExName, selectedMg || muscleGroups[0]?.name || '');
      const addedName = newExName.trim();
      setCustomVisible(false);
      setNewExName('');
      flashNotice('Custom exercise added');
      promptSaveThisToDay({ name: addedName, muscleGroup: selectedMg || muscleGroups[0]?.name || '' });
    } catch (err: any) {
      if (err?.message === 'EXERCISE_EXISTS') {
        Alert.alert('Duplicate Exercise', 'An exercise with this name already exists.');
      } else {
        Alert.alert('Error', 'Failed to add exercise.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const openEdit = (ex: Exercise) => {
    setEditingExercise(ex);
    setEditName(ex.name);
    setEditMg(ex.muscleGroup || muscleGroups[0]?.name || '');
  };

  const handleSaveEdit = async () => {
    if (!editingExercise || !editName.trim()) return;
    try {
      await db.updateExercise(editingExercise.id, editName, editMg || muscleGroups[0]?.name || '');
      setEditingExercise(null);
      await refreshData();
    } catch (err: any) {
      if (err?.message === 'EXERCISE_EXISTS') {
        Alert.alert('Duplicate Exercise', 'An exercise with this name already exists.');
      } else {
        Alert.alert('Error', 'Failed to update exercise.');
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await db.deleteExercise(pendingDelete.id);
      setPendingDelete(null);
      await refreshData();
    } catch (err) {
      console.error('Error deleting exercise:', err);
      setPendingDelete(null);
    }
  };

  const renderMgChips = (selected: string, onSelect: (name: string) => void) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.mgPickerScroll}
      contentContainerStyle={styles.mgPickerContent}
    >
      {muscleGroups.map((mg) => {
        const isSel = selected === mg.name;
        return (
          <TouchableOpacity
            key={mg.id}
            style={[styles.mgPickerChip, isSel && styles.mgPickerChipSelected]}
            onPress={() => onSelect(mg.name)}
          >
            <Text style={[styles.mgPickerText, isSel && styles.mgPickerTextSelected]}>
              {mg.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Exercise Library</Text>
          <Text style={styles.subtitle}>
            Search the built-in pool or add your own custom movements.
          </Text>
        </View>

        {/* Action bar: Search from pool / Add custom */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionCard, styles.actionSearch]}
            onPress={() => {
              setPoolQuery('');
              setPoolVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="search" size={20} color={COLORS.bgPrimary} />
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitleDark}>Search Exercise</Text>
              <Text style={styles.actionSubDark}>Browse the built-in library</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionCustom]}
            onPress={openCustom}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Add Custom Exercise</Text>
              <Text style={styles.actionSub}>Create one not in the pool</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Transient confirmation */}
        {addedNotice && (
          <View style={styles.noticeBox}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.accentGreen} />
            <Text style={styles.noticeText}>{addedNotice}</Text>
          </View>
        )}

        {/* Library list */}
        <Text style={styles.listTitle}>YOUR LIBRARY ({allExercises.length})</Text>
        {allExercises.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="barbell-outline" size={30} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              Your library is empty. Tap “Search Exercise” to pull in common movements, or create
              a custom one.
            </Text>
          </View>
        ) : (
          allExercises.map((ex) => (
            <View key={ex.id} style={styles.exRow}>
              <View style={styles.exInfo}>
                <Text style={styles.exName} numberOfLines={1}>
                  {ex.name}
                </Text>
                {ex.muscleGroup ? (
                  <View style={styles.mgTag}>
                    <Text style={styles.mgTagText}>{ex.muscleGroup}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.exActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => openEdit(ex)}
                  hitSlop={6}
                  accessibilityLabel={`Edit ${ex.name}`}
                >
                  <Ionicons name="pencil-outline" size={17} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => setPendingDelete(ex)}
                  hitSlop={6}
                  accessibilityLabel={`Delete ${ex.name}`}
                >
                  <Ionicons name="trash-outline" size={17} color={COLORS.accentRed} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ---------- Search Exercise (Pool) Modal ---------- */}
      <Modal
        visible={poolVisible}
        animationType="slide"
        onRequestClose={() => setPoolVisible(false)}
      >
        <SafeAreaView style={styles.poolSafe}>
          <View style={styles.poolHeader}>
            <Text style={styles.poolTitle}>Search Exercise</Text>
            <TouchableOpacity
              style={styles.poolClose}
              onPress={() => setPoolVisible(false)}
              hitSlop={6}
              accessibilityLabel="Close search"
            >
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises…"
              placeholderTextColor={COLORS.textMuted}
              value={poolQuery}
              onChangeText={setPoolQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {poolQuery.length > 0 && (
              <TouchableOpacity onPress={() => setPoolQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.helperNote}>
            Can’t find your exercise in the pool? You can always create your own via ‘Add Custom
            Exercise’.
          </Text>

          {/* Pool list grouped by muscle group */}
          {filteredPool.length === 0 ? (
            <View style={styles.poolEmpty}>
              <Ionicons name="search-outline" size={30} color={COLORS.textMuted} />
              <Text style={styles.poolEmptyText}>No exercises match “{poolQuery}”.</Text>
            </View>
          ) : (
            <SectionList
              sections={poolSections}
              keyExtractor={(item) => item.name}
              stickySectionHeadersEnabled
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.poolSectionHeader}>
                  <Text style={styles.poolSectionTitle}>{title}</Text>
                </View>
              )}
              renderItem={({ item }) => {
                const added = isPoolItemAdded(item.name);
                return (
                  <TouchableOpacity
                    style={[styles.poolRow, added && styles.poolRowAdded]}
                    onPress={() => handleAddFromPool(item)}
                    disabled={added}
                    activeOpacity={0.7}
                  >
                    <View style={styles.poolRowInfo}>
                      <Text style={[styles.poolRowName, added && styles.poolRowNameAdded]}>
                        {item.name}
                      </Text>
                      <View style={styles.poolMgTag}>
                        <Text style={styles.poolMgTagText}>{item.muscleGroup}</Text>
                      </View>
                    </View>
                    <View style={styles.poolAddSpan}>
                      {added ? (
                        <>
                          <Ionicons name="checkmark" size={18} color={COLORS.accentGreen} />
                          <Text style={styles.poolAddedText}>Added</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="add" size={18} color={COLORS.accent} />
                          <Text style={styles.poolAddText}>Add</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ---------- Add Custom Exercise Modal ---------- */}
      <Modal
        visible={customVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setCustomVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Exercise</Text>

            <Text style={styles.inputLabel}>EXERCISE NAME</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="e.g. Landmine Row"
              placeholderTextColor={COLORS.textMuted}
              value={newExName}
              onChangeText={setNewExName}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>TARGET MUSCLE GROUP</Text>
            <View style={styles.modalGbWrap}>
              {renderMgChips(selectedMg || muscleGroups[0]?.name || '', setSelectedMg)}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCustomVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAddCustom}
                disabled={isAdding}
              >
                <Text style={styles.modalSubmitText}>{isAdding ? 'Saving…' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Exercise Modal */}
      <Modal
        visible={editingExercise !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setEditingExercise(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Exercise</Text>

            <Text style={styles.inputLabel}>EXERCISE NAME</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Exercise name"
              placeholderTextColor={COLORS.textMuted}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.inputLabel}>TARGET MUSCLE GROUP</Text>
            <View style={styles.modalGbWrap}>
              {renderMgChips(editMg || muscleGroups[0]?.name || '', setEditMg)}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingExercise(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveEdit}>
                <Text style={styles.modalSubmitText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Exercise Confirmation */}
      <Modal
        visible={pendingDelete !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPendingDelete(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="trash-outline" size={22} color={COLORS.accentRed} />
            </View>
            <Text style={styles.confirmTitle}>Delete Exercise?</Text>
            <Text style={styles.confirmMessage}>
              “{pendingDelete?.name || 'This exercise'}” will be removed from your library, all day
              routines, and workout history.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setPendingDelete(null)}
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

      {/* Themed "Save this exercise to a workout day" dialog */}
      <Modal
        visible={savePrompt !== null}
        animationType="fade"
        transparent
        onRequestClose={closeSavePrompt}
      >
        <View style={styles.saveOverlay}>
          <View style={styles.saveDialog}>
            <View style={styles.saveRing}>
              <Ionicons name="barbell-outline" size={30} color={COLORS.accent} />
            </View>

            <Text style={styles.saveTitle}>Save this exercise to a workout day</Text>

            <Text style={styles.saveName}>
              “{savePrompt?.name}”
              {savePrompt?.muscleGroup ? (
                <Text style={styles.saveNameMg}>  •  {savePrompt.muscleGroup}</Text>
              ) : null}
            </Text>

            <Text style={styles.saveMessage}>
              It won’t appear in your workout until you add it to a desired day. Open the Workout
              tab, pick the day, and tap the + icon that day — or use a fresh, unsaved day to list
              every matching exercise automatically.
            </Text>

            <View style={styles.saveActions}>
              <TouchableOpacity style={styles.saveCancelBtn} onPress={closeSavePrompt}>
                <Text style={styles.saveCancelText}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveConfirmBtn} onPress={handleGoToWorkout}>
                <Ionicons name="barbell" size={16} color="#09090b" />
                <Text style={styles.saveConfirmText}>Go to Workout</Text>
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
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // Action bar
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.md,
  },
  actionCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  actionSearch: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionCustom: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitleDark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#09090b',
  },
  actionSubDark: {
    fontSize: 11,
    color: 'rgba(9, 9, 11, 0.7)',
    marginTop: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  // Transient notice
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: SPACING.md,
  },
  noticeText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  // Library list
  listTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  emptyBox: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: 10,
  },
  exInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  exName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  mgTag: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  mgTagText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  exActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // -------- Pool modal --------
  poolSafe: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  poolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  poolTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  poolClose: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.lg,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  helperNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  poolEmpty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: SPACING.xl,
  },
  poolEmptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  poolSectionHeader: {
    backgroundColor: COLORS.bgPrimary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  poolSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentBlue,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  poolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.lg,
    marginTop: 8,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  poolRowAdded: {
    opacity: 0.6,
  },
  poolRowInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  poolRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  poolRowNameAdded: {
    color: COLORS.textMuted,
  },
  poolMgTag: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  poolMgTagText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  poolAddSpan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
    justifyContent: 'flex-end',
  },
  poolAddText: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  poolAddedText: {
    color: COLORS.accentGreen,
    fontWeight: '700',
    fontSize: 13,
  },
  // Add-custom modal fields reuse inputLabel / nameInput / modal styles
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  nameInput: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 15,
    marginBottom: SPACING.md,
  },
  modalGbWrap: {
    marginBottom: SPACING.sm,
  },
  mgPickerScroll: {
    marginBottom: SPACING.md,
    flexGrow: 0,
  },
  mgPickerContent: {
    gap: 8,
    paddingRight: 8,
    flexDirection: 'row',
  },
  mgPickerChip: {
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mgPickerChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  mgPickerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  mgPickerTextSelected: {
    color: COLORS.bgPrimary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: SPACING.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  modalSubmitText: {
    color: COLORS.bgPrimary,
    fontWeight: '700',
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
  // Themed "Save this exercise to a workout day" dialog
  saveOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  saveDialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  saveRing: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228, 228, 231, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(228, 228, 231, 0.22)',
    marginBottom: SPACING.md,
  },
  saveTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  saveName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accentBlue,
    textAlign: 'center',
    marginBottom: 8,
  },
  saveNameMg: {
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  saveMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  saveActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  saveCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveConfirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
  },
  saveConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#09090b',
  },
});

