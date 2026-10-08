/**
 * UI tests for the live logging screen's set management, covering the behaviour
 * of the per-card header controls (`+` add set, `−` delete mode, `✓` done) and
 * the removal of the historical-sets clutter from the session cards.
 *
 * The data layer runs against the manual `expo-sqlite` mock (in-memory SQLite),
 * so the session rendered here is built from real template / history queries.
 * The navigation hooks are replaced with stand-ins, which lets the screen mount
 * without a navigator.
 */
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import ActiveWorkoutScreen, { FOOTER_CLEARANCE } from '../ActiveWorkoutScreen';
import { SET_COLUMN_WIDTHS } from '../../theme/layout';
import * as db from '../../services/database';
import {
  clearWorkoutDraft,
  getWorkoutDraft,
} from '../../services/workoutDraftService';

/** Stand-in for the parent tab navigator, so its options can be asserted. */
const mockParentNavigation = {
  setOptions: jest.fn(),
  navigate: jest.fn(),
};

const mockNavigation = {
  setOptions: jest.fn(),
  getParent: jest.fn(() => mockParentNavigation),
  goBack: jest.fn(),
  reset: jest.fn(),
};

const mockRoute = {
  key: 'active-workout-test',
  name: 'ActiveWorkout',
  params: {
    date: '2026-08-31',
    day: 'Monday' as const,
    dayName: 'Chest',
    mode: 'logging' as 'logging' | 'template',
  },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

const renderedTrees: ReactTestRenderer[] = [];

/** Flattens every string rendered anywhere in the tree. */
function collectStrings(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(collectStrings);
  if (node && typeof node === 'object' && 'props' in (node as Record<string, unknown>)) {
    return collectStrings((node as { props: { children?: unknown } }).props.children);
  }
  return [];
}

function renderedText(tree: ReactTestRenderer): string {
  return tree.root
    .findAllByType(Text)
    .flatMap((node) => collectStrings(node.props.children))
    .join('|');
}

/** Number of set rows on screen (one weight input per row). */
function weightInputs(tree: ReactTestRenderer) {
  return tree.root
    .findAllByType(TextInput)
    .filter((node) => node.props.keyboardType === 'numeric');
}

function setRowCount(tree: ReactTestRenderer): number {
  return weightInputs(tree).length;
}

/** Resolved style of every direct child (column) of a table row. */
function rowColumns(row: ReactTestInstance): Record<string, unknown>[] {
  return row.children
    .filter((child): child is ReactTestInstance => typeof child !== 'string')
    .map((child) => ({ ...(StyleSheet.flatten(child.props.style) ?? {}) }));
}

/** Column geometry only — the part a header row and a data row must agree on. */
function columnWidths(columns: Record<string, unknown>[]) {
  return columns.map(({ width, flex }) => ({ width, flex }));
}

/** The uniform column spacing a table row gaps its columns with. */
function columnGap(row: ReactTestInstance): unknown {
  return (StyleSheet.flatten(row.props.style) ?? {}).columnGap;
}

/** The nearest table row above a node: the flex row spaced by the shared gap. */
function tableRow(node: ReactTestInstance): ReactTestInstance {
  let current = node.parent;
  while (current) {
    const style = StyleSheet.flatten(current.props.style) ?? {};
    if (style.flexDirection === 'row' && style.columnGap === SET_COLUMN_WIDTHS.columnGap) {
      return current;
    }
    current = current.parent;
  }
  throw new Error('Node is not inside a table row');
}

/** The card's header row: the row carrying the SET/PREVIOUS/WEIGHT/REPS labels. */
function headerRow(tree: ReactTestRenderer): ReactTestInstance {
  const label = tree.root
    .findAllByType(Text)
    .find((node) => collectStrings(node.props.children).join('') === 'REPS');
  if (!label) throw new Error('No REPS column label rendered');
  return tableRow(label);
}

/** The set rows, in render order. */
function setRows(tree: ReactTestRenderer): ReactTestInstance[] {
  return weightInputs(tree).map(tableRow);
}

/** Accessibility labels of the screen's touchable controls. */
function controlLabels(tree: ReactTestRenderer): string[] {
  return tree.root
    .findAllByType(TouchableOpacity)
    .map((node) => node.props.accessibilityLabel as string | undefined)
    .filter((label): label is string => typeof label === 'string');
}

/** Accessibility labels of the per-row delete badges currently revealed. */
function deleteBadgeLabels(tree: ReactTestRenderer): string[] {
  return controlLabels(tree).filter((label) => /^Remove set \d+ from /.test(label));
}

async function tap(tree: ReactTestRenderer, accessibilityLabel: string): Promise<void> {
  const button = tree.root
    .findAllByType(TouchableOpacity)
    .find((node) => node.props.accessibilityLabel === accessibilityLabel);
  if (!button) throw new Error(`No control labelled "${accessibilityLabel}"`);
  await act(async () => {
    button.props.onPress();
  });
}

async function typeWeight(
  tree: ReactTestRenderer,
  rowIndex: number,
  value: string
): Promise<void> {
  const inputs = weightInputs(tree);
  await act(async () => {
    inputs[rowIndex].props.onChangeText(value);
  });
}

/** Seeds a Chest day routine (3 target sets) plus an optional prior session. */
async function seedSession(withHistory: boolean): Promise<void> {
  const exercise = await db.addExercise('Bench Press', 'Chest');
  await db.saveDayTemplate('Monday', [{ exerciseId: exercise.id, targetSets: 3 }]);
  if (withHistory) {
    await db.saveWorkoutLog('2026-08-24', 'Monday', '', [
      { exerciseId: exercise.id, setNumber: 1, weight: 80, reps: 8 },
      { exerciseId: exercise.id, setNumber: 2, weight: 80, reps: 7 },
    ]);
  }
}

/** Seeds a three-exercise Monday routine and returns it in its saved order. */
async function seedRoutine() {
  const bench = await db.addExercise('Bench Press', 'Chest');
  const fly = await db.addExercise('Cable Fly', 'Chest');
  const dip = await db.addExercise('Dip', 'Triceps');
  const order = [bench, fly, dip];

  await db.saveDayTemplate(
    'Monday',
    order.map((exercise) => ({ exerciseId: exercise.id, targetSets: 3 }))
  );
  return order;
}

/** The routine cards, in the order they are rendered. */
function cardOrder(tree: ReactTestRenderer): string[] {
  const ids: string[] = [];
  for (const node of tree.root.findAll(
    (candidate) =>
      typeof candidate.props?.testID === 'string' &&
      candidate.props.testID.startsWith('routine-card-')
  )) {
    const id = (node.props.testID as string).replace('routine-card-', '');
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** The node that actually carries the drag callbacks for one routine card. */
function dragHandle(tree: ReactTestRenderer, exerciseId: string) {
  const handle = tree.root
    .findAll((node) => node.props?.testID === `drag-handle-${exerciseId}`)
    .find((node) => typeof node.props.onResponderGrant === 'function');
  if (!handle) throw new Error(`No drag handle for ${exerciseId}`);
  return handle;
}

/** The routine card node: the element that carries the drag transform. */
function routineCard(tree: ReactTestRenderer, exerciseId: string) {
  const card = tree.root
    .findAll((node) => node.props?.testID === `routine-card-${exerciseId}`)
    .find((node) => typeof node.props.onLayout === 'function');
  if (!card) throw new Error(`No routine card for ${exerciseId}`);
  return card;
}

/** Resolved style of a routine card. */
function cardStyle(tree: ReactTestRenderer, exerciseId: string): Record<string, unknown> {
  return { ...(StyleSheet.flatten(routineCard(tree, exerciseId).props.style) ?? {}) };
}

/** The list a routine card is rendered in. */
function routineList(tree: ReactTestRenderer, exerciseId: string): ReactTestInstance {
  let current = routineCard(tree, exerciseId).parent;
  while (current) {
    if (current.type === ScrollView) return current;
    current = current.parent;
  }
  throw new Error('Routine card is not inside a ScrollView');
}

/** Reports a laid-out height for the given routine cards. */
async function layOutRoutine(
  tree: ReactTestRenderer,
  heightsById: Record<string, number>
): Promise<void> {
  await act(async () => {
    for (const [exerciseId, height] of Object.entries(heightsById)) {
      routineCard(tree, exerciseId).props.onLayout({
        nativeEvent: { layout: { height, width: 320, x: 0, y: 0 } },
      });
    }
  });
}

/** Drags a routine card by `deltaY` px through its handle, then drops it. */
async function dragRoutineCard(
  tree: ReactTestRenderer,
  exerciseId: string,
  deltaY: number
): Promise<void> {
  const handle = dragHandle(tree, exerciseId);

  await act(async () => {
    handle.props.onResponderGrant({ nativeEvent: { pageY: 100 } });
  });
  await act(async () => {
    handle.props.onResponderMove({ nativeEvent: { pageY: 100 + deltaY } });
  });
  await act(async () => {
    handle.props.onResponderRelease({ nativeEvent: { pageY: 100 + deltaY } });
  });
}

/** Lets fire-and-forget writes (routine order, drafts) settle. */
async function flushPromises(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Exercise names ordered by where they appear on screen. */
function namesInRenderOrder(tree: ReactTestRenderer, names: string[]): string[] {
  const text = renderedText(tree);
  return [...names].sort((a, b) => text.indexOf(a) - text.indexOf(b));
}

async function renderWorkout(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<ActiveWorkoutScreen />);
  });
  renderedTrees.push(tree);
  return tree;
}

describe('ActiveWorkoutScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const handle = await db.getDB();
    await handle.execAsync(
      'DELETE FROM workout_sets; DELETE FROM day_templates; DELETE FROM workout_logs; DELETE FROM exercises;'
    );
    await clearWorkoutDraft();
    // SafeAreaView's deprecation notice from react-native adds noise only
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    for (const tree of renderedTrees.splice(0)) {
      await act(async () => tree.unmount());
    }
    await clearWorkoutDraft();
    jest.restoreAllMocks();
  });

  describe('card body', () => {
    it('prepares one blank row per target set and keeps the history inline', async () => {
      await seedSession(true);

      const tree = await renderWorkout();

      expect(setRowCount(tree)).toBe(3);
      // The history stays as a compact per-row reference, not as a banner
      expect(renderedText(tree)).toContain('PREVIOUS');
      expect(renderedText(tree)).toContain('80 kg × 8');
      expect(renderedText(tree)).not.toContain('Prev: ');
      expect(renderedText(tree)).not.toContain('No historical data recorded');
    });

    it('carries no permanent per-row delete button', async () => {
      await seedSession(false);

      const tree = await renderWorkout();

      expect(deleteBadgeLabels(tree)).toEqual([]);
    });
  });

  describe('column grid', () => {
    it('lays the header labels and the set cells out from one column definition', async () => {
      await seedSession(false);

      const tree = await renderWorkout();

      const header = rowColumns(headerRow(tree));
      expect(columnWidths(header)).toEqual([
        { width: 36, flex: undefined }, // SET
        { width: undefined, flex: 1 }, // PREVIOUS — responsive fill
        { width: 80, flex: undefined }, // WEIGHT (KG)
        { width: 64, flex: undefined }, // REPS
      ]);

      const rows = setRows(tree);
      expect(rows).toHaveLength(3);
      // Headers and rows repeat the same widths and the same uniform gap.
      expect(columnGap(headerRow(tree))).toBe(10);
      for (const row of rows) {
        expect(columnWidths(rowColumns(row))).toEqual(columnWidths(header));
        expect(columnGap(row)).toBe(10);
      }

      // Every label is centred on its column...
      expect(header.map((column) => column.textAlign)).toEqual([
        'center',
        'center',
        'center',
        'center',
      ]);
      // ...and each input pill fills its column edge to edge, so the label and
      // the pill share a centre line instead of being offset by a fixed gap.
      for (const row of rows) {
        const columns = rowColumns(row);
        expect(columns[0].textAlign).toBe('center'); // row index
        expect(columns[1].textAlign).toBe('center'); // previous benchmark
      }
      const pills = tree.root
        .findAllByType(TextInput)
        .filter((node) => node.props.keyboardType != null);
      expect(pills).toHaveLength(rows.length * 2); // weight + reps per row
      for (const pill of pills) {
        expect(StyleSheet.flatten(pill.props.style)).toMatchObject({
          width: '100%',
          textAlign: 'center',
        });
      }
    });

    it('keeps the header and rows in step when the delete-mode column appears', async () => {
      await seedSession(false);

      const tree = await renderWorkout();
      const header = rowColumns(headerRow(tree));

      await tap(tree, 'Remove sets from Bench Press');

      const headerWithAction = rowColumns(headerRow(tree));
      expect(columnWidths(headerWithAction)).toEqual([
        ...columnWidths(header),
        { width: SET_COLUMN_WIDTHS.action, flex: undefined }, // action slot
      ]);
      for (const row of setRows(tree)) {
        expect(columnWidths(rowColumns(row))).toEqual(columnWidths(headerWithAction));
      }
    });
  });

  describe('header set manager', () => {
    it('appends a set row from the card header "+"', async () => {
      await seedSession(false);

      const tree = await renderWorkout();
      await tap(tree, 'Add set to Bench Press');

      expect(setRowCount(tree)).toBe(4);
    });

    it('reveals the per-row delete badges only while that card is in delete mode', async () => {
      await seedSession(false);

      const tree = await renderWorkout();
      await tap(tree, 'Remove sets from Bench Press');

      expect(deleteBadgeLabels(tree)).toEqual([
        'Remove set 1 from Bench Press',
        'Remove set 2 from Bench Press',
        'Remove set 3 from Bench Press',
      ]);
      // The "−" control is swapped for the "✓" (done) control
      expect(controlLabels(tree)).not.toContain('Remove sets from Bench Press');
      expect(controlLabels(tree)).toContain('Done removing sets from Bench Press');
    });

    it('deletes a set through its badge and renumbers the remaining rows', async () => {
      await seedSession(false);

      const tree = await renderWorkout();
      await tap(tree, 'Remove sets from Bench Press');
      await tap(tree, 'Remove set 2 from Bench Press');

      expect(setRowCount(tree)).toBe(2);
      expect(deleteBadgeLabels(tree)).toEqual([
        'Remove set 1 from Bench Press',
        'Remove set 2 from Bench Press',
      ]);
    });

    it('never deletes the last remaining set row', async () => {
      await seedSession(false);

      const tree = await renderWorkout();
      await tap(tree, 'Remove sets from Bench Press');
      await tap(tree, 'Remove set 1 from Bench Press');
      await tap(tree, 'Remove set 1 from Bench Press');

      expect(setRowCount(tree)).toBe(1);
    });

    it('exits delete mode and saves the configuration on "✓"', async () => {
      await seedSession(false);

      const tree = await renderWorkout();
      await tap(tree, 'Remove sets from Bench Press');
      await typeWeight(tree, 0, '100');
      await tap(tree, 'Done removing sets from Bench Press');

      expect(deleteBadgeLabels(tree)).toEqual([]);
      expect(controlLabels(tree)).toContain('Remove sets from Bench Press');

      const draft = await getWorkoutDraft();
      expect(draft?.date).toBe('2026-08-31');
      expect(draft?.exerciseLogs[0].sets[0].weight).toBe('100');
      expect(draft?.exerciseLogs[0].sets).toHaveLength(3);
    });

    it('does not persist a draft while the session has no input', async () => {
      await seedSession(false);

      const tree = await renderWorkout();
      await tap(tree, 'Remove sets from Bench Press');
      await tap(tree, 'Done removing sets from Bench Press');

      expect(await getWorkoutDraft()).toBeNull();
    });
  });

  describe('tab bar', () => {
    it('hides the tab bar while logging and restores it on exit', async () => {
      await seedSession(false);

      const tree = await renderWorkout();

      expect(mockParentNavigation.setOptions).toHaveBeenCalledWith({
        tabBarStyle: { display: 'none' },
      });

      await act(async () => tree.unmount());
      expect(mockParentNavigation.setOptions).toHaveBeenCalledWith({
        tabBarStyle: expect.objectContaining({ display: 'flex' }),
      });
    });
  });

  describe('routine builder reordering', () => {
    // The Workout tab's day editor: exercises + target sets, reordered by drag
    beforeEach(() => {
      mockRoute.params = { ...mockRoute.params, mode: 'template' };
    });

    afterEach(() => {
      mockRoute.params = { ...mockRoute.params, mode: 'logging' };
    });

    it('offers a drag handle on every exercise of the routine', async () => {
      const [bench, fly, dip] = await seedRoutine();

      const tree = await renderWorkout();

      const handleLabels = tree.root
        .findAll((node) => typeof node.props?.accessibilityLabel === 'string')
        .map((node) => node.props.accessibilityLabel as string);

      expect(handleLabels).toEqual(
        expect.arrayContaining([
          `Reorder ${bench.name}`,
          `Reorder ${fly.name}`,
          `Reorder ${dip.name}`,
        ])
      );
    });

    it('reorders the routine live while a card is dragged, and saves the dropped order', async () => {
      const [bench, fly, dip] = await seedRoutine();
      const tree = await renderWorkout();
      // 100px cards at the list's 24px gap: the first swap boundary sits at 112
      await layOutRoutine(tree, { [bench.id]: 100, [fly.id]: 100, [dip.id]: 100 });
      expect(cardOrder(tree)).toEqual([bench.id, fly.id, dip.id]);

      await dragRoutineCard(tree, bench.id, 113);
      await flushPromises();

      // The list itself moved...
      expect(cardOrder(tree)).toEqual([fly.id, bench.id, dip.id]);
      // ...and the routine on disk was re-ordered to match, without waiting for
      // the explicit save, so the next session opens in this order too
      expect((await db.getDayTemplate('Monday')).map((t) => t.exercise.id)).toEqual([
        fly.id,
        bench.id,
        dip.id,
      ]);
    });

    it('keeps the order when a card is dragged less than half a row', async () => {
      const [bench, fly, dip] = await seedRoutine();
      const tree = await renderWorkout();
      await layOutRoutine(tree, { [bench.id]: 100, [fly.id]: 100, [dip.id]: 100 });

      await dragRoutineCard(tree, bench.id, 50);
      await flushPromises();

      expect(cardOrder(tree)).toEqual([bench.id, fly.id, dip.id]);
      expect((await db.getDayTemplate('Monday')).map((t) => t.exercise.id)).toEqual([
        bench.id,
        fly.id,
        dip.id,
      ]);
    });

    it('drags a card upwards over its neighbour', async () => {
      const [bench, fly, dip] = await seedRoutine();
      const tree = await renderWorkout();
      await layOutRoutine(tree, { [bench.id]: 100, [fly.id]: 100, [dip.id]: 100 });

      // Dip sits at the bottom: -113 takes it past the boundary above it
      await dragRoutineCard(tree, dip.id, -113);
      await flushPromises();

      expect(cardOrder(tree)).toEqual([bench.id, dip.id, fly.id]);
      expect((await db.getDayTemplate('Monday')).map((t) => t.exercise.id)).toEqual([
        bench.id,
        dip.id,
        fly.id,
      ]);
    });

    it('locks the list while a card is in the air and unlocks it the moment it is dropped', async () => {
      const [bench] = await seedRoutine();
      const tree = await renderWorkout();
      await layOutRoutine(tree, { [bench.id]: 100 });
      const list = routineList(tree, bench.id);
      expect(list.props.scrollEnabled).toBe(true);

      const handle = dragHandle(tree, bench.id);
      await act(async () => {
        handle.props.onResponderGrant({ nativeEvent: { pageY: 100 } });
      });
      // Grabbed: the list must not read the vertical movement as a scroll
      expect(routineList(tree, bench.id).props.scrollEnabled).toBe(false);

      await act(async () => {
        handle.props.onResponderMove({ nativeEvent: { pageY: 180 } });
      });
      expect(routineList(tree, bench.id).props.scrollEnabled).toBe(false);

      await act(async () => {
        handle.props.onResponderRelease({ nativeEvent: { pageY: 180 } });
      });
      // Released: scrolling works again before the card has finished settling
      expect(routineList(tree, bench.id).props.scrollEnabled).toBe(true);
    });

    it('keeps the dragged card above the list and the list clear of the footer', async () => {
      const [bench] = await seedRoutine();
      const tree = await renderWorkout();

      // The list stops above the footer, so a dragged card is clipped at the
      // list edge instead of sliding under the "Save Day Routine" button
      const list = routineList(tree, bench.id);
      expect(StyleSheet.flatten(list.props.style)).toMatchObject({
        marginBottom: FOOTER_CLEARANCE,
      });
      expect(FOOTER_CLEARANCE).toBeGreaterThan(0);

      const idle = cardStyle(tree, bench.id);
      expect(idle.zIndex).toBeUndefined();
      expect(idle.elevation).toBeUndefined();

      await act(async () => {
        dragHandle(tree, bench.id).props.onResponderGrant({ nativeEvent: { pageY: 100 } });
      });

      // In the air: lifted over every sibling row, on both stacking systems
      const dragged = cardStyle(tree, bench.id);
      expect(dragged.zIndex).toBe(9999);
      expect(dragged.elevation).toBe(10);
    });

    it('leaves the routine untouched when a drag only taps the handle', async () => {
      const [bench, fly, dip] = await seedRoutine();
      const tree = await renderWorkout();
      await layOutRoutine(tree, { [bench.id]: 100, [fly.id]: 100, [dip.id]: 100 });

      await dragRoutineCard(tree, bench.id, 0);
      await flushPromises();

      expect(cardOrder(tree)).toEqual([bench.id, fly.id, dip.id]);
    });

    it('opens a logging session with the exercises in the configured order', async () => {
      const [bench, fly] = await seedRoutine();
      mockRoute.params = { ...mockRoute.params, mode: 'logging' };

      const tree = await renderWorkout();

      expect(namesInRenderOrder(tree, [bench.name, fly.name])).toEqual([bench.name, fly.name]);

      // The routine order is the session order, so the drag survives into the
      // workout the user is about to log
      await db.updateDayTemplateOrder('Monday', [fly.id, bench.id]);
      const reordered = await renderWorkout();
      expect(namesInRenderOrder(reordered, [bench.name, fly.name])).toEqual([fly.name, bench.name]);
    });
  });
});
