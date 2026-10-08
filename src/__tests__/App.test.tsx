/**
 * Navigation contract for the bottom "Workout" tab.
 *
 * The tab is the routine/days hub: it must always open WorkoutDaysScreen, even
 * while an ActiveWorkout route is still sitting on that tab's stack (a template
 * editor, or a session/draft the user stepped away from). The live logger is
 * reachable only through "Start Workout" and the draft banner's "Resume".
 *
 * The whole app is mounted here (against the in-memory SQLite mock), and the
 * focus of WorkoutDaysScreen is observed through its own focus effect, which is
 * the screen's real signal that the tab landed on the days list.
 */
import 'react-native-gesture-handler/jestSetup';
import { Text } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import App from '../../App';
import * as db from '../services/database';
import { useAppStore } from '../store/useAppStore';

jest.mock('../services/notifeeTimerService', () => ({
  initNotifee: jest.fn(async () => {}),
  cancelRestTimerNotification: jest.fn(async () => {}),
}));

// The chart library ships untranspiled ESM and is a rendering concern only
jest.mock('react-native-gifted-charts', () => ({
  LineChart: () => null,
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

async function renderApp(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<App />);
  });
  renderedTrees.push(tree);

  // The splash ("OMEGA GYM") is up until the store has finished initializing
  for (let attempt = 0; attempt < 20 && useAppStore.getState().isLoading; attempt++) {
    await act(async () => {});
  }
  expect(useAppStore.getState().isLoading).toBe(false);

  return tree;
}

describe('bottom tab navigation', () => {
  beforeEach(async () => {
    const handle = await db.getDB();
    await handle.execAsync(
      'DELETE FROM workout_sets; DELETE FROM day_templates; DELETE FROM workout_logs; DELETE FROM exercises;'
    );
    useAppStore.setState({ isLoading: true });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    for (const tree of renderedTrees.splice(0)) {
      await act(async () => tree.unmount());
    }
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('opens the days list on every press, even with an ActiveWorkout route on its stack', async () => {
    const daysListFocus = jest.spyOn(db, 'getDayTemplateCounts');

    const tree = await renderApp();
    // Lazy tabs: the Workout stack is not mounted until its tab is pressed
    expect(daysListFocus).not.toHaveBeenCalled();

    await press(tabButton(tree, 'Workout'));
    expect(daysListFocus).toHaveBeenCalledTimes(1);
    expect(renderedText(tree)).toContain('Select Day');

    // Entering the routine editor pushes ActiveWorkout onto that stack
    await press(touchableWithText(tree, 'Monday'));
    expect(renderedText(tree)).toContain('Save Day Routine');
    expect(daysListFocus).toHaveBeenCalledTimes(1);

    // Step away to another tab; the Workout stack keeps ActiveWorkout on top
    await press(tabButton(tree, 'Dashboard'));
    expect(daysListFocus).toHaveBeenCalledTimes(1);

    // Pressing "Workout" again must land on the days list, not the editor
    await press(tabButton(tree, 'Workout'));
    expect(daysListFocus).toHaveBeenCalledTimes(2);
    expect(renderedText(tree)).not.toContain('Save Day Routine');
    expect(renderedText(tree)).toContain('Select Day');
  });
});
