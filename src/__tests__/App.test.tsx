/**
 * Navigation and session-isolation contract for the app shell.
 *
 * The bottom "Workout" tab is a ROOT hub screen: it lists the week's routines
 * and offers "Start Workout", and it must never carry the live logger in its
 * history or show a back button into a finished/discarded session. The live
 * workout itself is an ephemeral full-screen flow on the root stack, above the
 * tabs, and every "Start Workout" pushes a brand-new mount.
 *
 * The whole app is mounted here (against the in-memory SQLite mock), so these
 * tests exercise the real navigator rather than a mocked screen tree.
 */
import 'react-native-gesture-handler/jestSetup';
import { Text, TextInput } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import App, { navigationRef } from '../../App';
import * as db from '../services/database';
import { useAppStore } from '../store/useAppStore';
import { useActiveWorkoutStore } from '../store/useActiveWorkoutStore';
import {
  clearWorkoutDraft,
  getWorkoutDraft,
  saveWorkoutDraft,
} from '../services/workoutDraftService';
import { DayOfWeek } from '../types';
import { formatISODate } from '../utils/dateUtils';

jest.mock('../services/notifeeTimerService', () => ({
  initNotifee: jest.fn(async () => {}),
  cancelRestTimerNotification: jest.fn(async () => {}),
}));

// The chart library ships untranspiled ESM and is a rendering concern only
jest.mock('react-native-gifted-charts', () => ({
  LineChart: () => null,
}));

const renderedTrees: ReactTestRenderer[] = [];

const DAYS: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const EMPTY_SPLIT: Record<DayOfWeek, string[]> = {
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
};

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

/** A bottom tab bar button, located by the label it renders. */
function tabButton(tree: ReactTestRenderer, label: string) {
  const button = tree.root
    .findAll(
      (node) =>
        typeof node.props?.onPress === 'function' && node.props?.['aria-selected'] !== undefined
    )
    .find((node) => collectStrings(node.props.children).includes(label));
  expect(button).toBeDefined();
  return button!;
}

/** A touchable whose rendered content contains `label`. */
function touchableWithText(tree: ReactTestRenderer, label: string) {
  const button = tree.root
    .findAll((node) => typeof node.props?.onPress === 'function')
    .find((node) => collectStrings(node.props.children).includes(label));
  expect(button).toBeDefined();
  return button!;
}

async function press(node: { props: { onPress?: () => void } }): Promise<void> {
  await act(async () => {
    node.props.onPress?.();
  });
}

/** Lets pending promises/timers settle until `check` holds. */
async function waitFor(check: () => boolean, message: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (check()) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
  throw new Error(message);
}

async function renderApp(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<App />);
  });
  renderedTrees.push(tree);

  // The splash ("OMEGA GYM") is up until the store has finished initializing
  await waitFor(() => !useAppStore.getState().isLoading, 'store never finished initializing');

  return tree;
}

describe('app navigation and session isolation', () => {
  beforeEach(async () => {
    const handle = await db.getDB();
    await handle.execAsync(
      'DELETE FROM workout_sets; DELETE FROM day_templates; DELETE FROM workout_logs; DELETE FROM exercises;'
    );
    await clearWorkoutDraft();
    useActiveWorkoutStore.getState().resetActiveWorkoutSession();
    useAppStore.setState({ isLoading: true });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    for (const tree of renderedTrees.splice(0)) {
      await act(async () => tree.unmount());
    }
    await clearWorkoutDraft();
    useActiveWorkoutStore.getState().resetActiveWorkoutSession();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('opens the days hub directly on the Workout tab', async () => {
    const daysListFocus = jest.spyOn(db, 'getDayTemplateCounts');

    const tree = await renderApp();
    // Lazy tabs: the Workout screen is not mounted until its tab is pressed
    expect(daysListFocus).not.toHaveBeenCalled();

    await press(tabButton(tree, 'Workout'));

    expect(daysListFocus).toHaveBeenCalledTimes(1);
    expect(renderedText(tree)).toContain('Select Day');
  });

  it('presents the live workout above the tab navigator', async () => {
    const chest = await db.addExercise('Bench Press', 'Chest');
    const today = new Date();
    const day = DAYS[today.getDay()];
    await db.saveDayTemplate(day, [{ exerciseId: chest.id, targetSets: 3 }]);

    const tree = await renderApp();
    await press(tabButton(tree, 'Workout'));
    expect(tabButton(tree, 'Dashboard')).toBeDefined();

    // Tapping a day opens the routine/live flow on the ROOT stack…
    await press(touchableWithText(tree, day));

    expect(renderedText(tree)).toContain('Save Day Routine');

    // The live flow is a sibling of the tabs on the ROOT stack…
    const rootState = navigationRef.getRootState();
    expect(rootState?.routes.map((route) => route.name)).toEqual(['Tabs', 'ActiveWorkout']);

    // …and the Workout tab itself has no nested navigator/state, so it cannot
    // hold the live session in any history and has nothing to go back to.
    const tabState = rootState?.routes[0].state as
      | { routes: { name: string; state?: unknown }[] }
      | undefined;
    const workoutTab = tabState?.routes.find((route) => route.name === 'Workout');
    expect(workoutTab).toBeDefined();
    expect(workoutTab?.state).toBeUndefined();
  });

  it('starts a pristine session after the recovery draft is discarded', async () => {
    // A crashed session left values behind: 100 kg × 8 on the first set.
    const chest = await db.addExercise('Bench Press', 'Chest');
    const muscleGroups = await db.getMuscleGroups();
    const chestGroup = muscleGroups.find((group) => group.name === 'Chest');
    const today = new Date();
    const dateStr = formatISODate(today);
    const day = DAYS[today.getDay()];

    await db.saveDayTemplate(day, [{ exerciseId: chest.id, targetSets: 3 }]);
    await db.saveWeeklySplit(
      chestGroup ? { ...EMPTY_SPLIT, [day]: [chestGroup.id] } : EMPTY_SPLIT
    );
    await saveWorkoutDraft({
      date: dateStr,
      day,
      dayName: 'Chest',
      startedAt: Date.now(),
      exerciseLogs: [
        {
          exercise: { id: chest.id, name: chest.name, muscleGroup: 'Chest' },
          previousSets: [],
          sets: [{ setNumber: 1, weight: '100', reps: '8' }],
        },
      ],
    });

    const tree = await renderApp();
    await waitFor(
      () => renderedText(tree).includes('Workout in Progress'),
      'recovery banner never appeared'
    );

    // Discard tears down storage AND the in-memory session.
    await press(touchableWithText(tree, 'Discard'));
    await waitFor(
      () => !renderedText(tree).includes('Workout in Progress'),
      'recovery banner was not dismissed'
    );
    expect(await getWorkoutDraft()).toBeNull();
    expect(useActiveWorkoutStore.getState().session).toBeNull();

    // Starting a workout now must open a brand-new, blank session.
    await press(touchableWithText(tree, 'Start Workout'));
    await waitFor(
      () => tree.root.findAllByType(TextInput).length > 0,
      'workout screen never rendered its set inputs'
    );

    const inputs = tree.root.findAllByType(TextInput);
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) {
      expect(input.props.value).toBe('');
    }
    expect(renderedText(tree)).not.toContain('100');
    expect(renderedText(tree)).toContain('Finish & Save Workout');

    // The fresh session is registered in memory, with no trace of the draft.
    expect(useActiveWorkoutStore.getState().session?.logId).toEqual(expect.any(String));
    expect(useActiveWorkoutStore.getState().session?.date).toBe(dateStr);
    expect(await getWorkoutDraft()).toBeNull();
  });
});
