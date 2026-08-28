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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { Exercise } from '../types';
import * as db from '../services/database';

export default function ExercisesScreen() {
  const { muscleGroups, allExercises, refreshData, addExercise } = useAppStore();

  // Add form state
  const [newExName, setNewExName] = useState('');
  const [selectedMg, setSelectedMg] = useState<string>(muscleGroups[0]?.name || '');
  const [isAdding, setIsAdding] = useState(false);

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
    }, [refreshData])
  );

  const handleAdd = async () => {
    if (!newExName.trim()) {
      Alert.alert('Missing Name', 'Please enter an exercise name.');
      return;
    }
    setIsAdding(true);
    try {
      await addExercise(newExName, selectedMg || muscleGroups[0]?.name || '');
      setNewExName('');
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

  const renderMgChips = (
    selected: string,
    onSelect: (name: string) => void
  ) => (
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
            {allExercises.length} {allExercises.length === 1 ? 'exercise' : 'exercises'} in your
            global catalog
          </Text>
        </View>

        {/* Add Exercise Form */}
        <View style={styles.addCard}>
          <Text style={styles.inputLabel}>EXERCISE NAME</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g. Barbell Bench Press"
            placeholderTextColor={COLORS.textMuted}
            value={newExName}
            onChangeText={setNewExName}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />

          <Text style={styles.inputLabel}>TARGET MUSCLE GROUP</Text>
          {renderMgChips(selectedMg || muscleGroups[0]?.name || '', setSelectedMg)}

          <TouchableOpacity
            style={[styles.addButton, isAdding && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={isAdding}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#09090b" />
            <Text style={styles.addButtonText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>

        {/* Exercise List */}
        <Text style={styles.listTitle}>ALL EXERCISES</Text>
        {allExercises.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="barbell-outline" size={30} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              Your library is empty. Add your first exercise above — it will be available when
              building day routines.
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
            {renderMgChips(editMg || muscleGroups[0]?.name || '', setEditMg)}

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
              "{pendingDelete?.name || 'This exercise'}" will be removed from your library, all
              day routines, and workout history.
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
  addCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
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
  mgPickerScroll: {
    marginBottom: SPACING.md,
  },
  mgPickerContent: {
    gap: 8,
    paddingRight: 8,
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
    color: '#09090b',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#09090b',
    fontSize: 15,
    fontWeight: '700',
  },
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
    lineHeight: 18,
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
    fontSize: 20,
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
    color: '#09090b',
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
});
