/**
 * UI tests for the dashboard header, verifying that the streak badge opens the
 * all-time streak history sheet. The data layer runs against the manual
 * `expo-sqlite` mock (in-memory SQLite), so the rendered numbers are real.
 */
import { Text } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import DashboardScreen from '../DashboardScreen';
import * as db from '../../services/database';
import { useAppStore } from '../../store/useAppStore';
import { formatISODate } from '../../utils/dateUtils';

// The embedded draft banner uses the focus hook, which requires a navigator;
// re-implementing it on top of useEffect lets the screen render standalone.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => void) => {
    const ReactModule = require('react');
    ReactModule.useEffect(callback, [callback]);
  },
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

function renderedStrings(tree: ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).flatMap((node) => collectStrings(node.props.children));
}

/** All rendered text joined into one string (composite rows collapse cleanly). */
function renderedText(tree: ReactTestRenderer): string {
  return renderedStrings(tree).join('');
}

async function renderDashboard(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <DashboardScreen
        onStartWorkout={() => {}}
        onResumeWorkout={() => {}}
        onNavigateSplitSetup={() => {}}
      />
    );
  });
  renderedTrees.push(tree);
  return tree;
}

async function tap(tree: ReactTestRenderer, accessibilityLabel: string): Promise<void> {
  const button = tree.root.findByProps({ accessibilityLabel });
  await act(async () => {
    button.props.onPress();
  });
}

describe('DashboardScreen streak badge', () => {
  beforeEach(async () => {
    const handle = await db.getDB();
    await handle.execAsync(
      'DELETE FROM workout_sets; DELETE FROM day_templates; DELETE FROM workout_logs; DELETE FROM exercises;'
    );
    // The screen holds its reads back until the store reports that
    // initialization finished, so stand in for App here: without it the
    // dashboard would stay unloaded for the whole test.
    await useAppStore.getState().initStore();
    // SafeAreaView's deprecation notice from react-native adds noise only
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    for (const tree of renderedTrees.splice(0)) {
      await act(async () => tree.unmount());
    }
    jest.restoreAllMocks();
  });

  it('opens the all-time streak history sheet when the badge is tapped', async () => {
    const exercise = await db.addExercise('Bench Press', 'Chest');
    for (const date of ['2026-08-01', '2026-08-02', '2026-08-03']) {
      await db.saveWorkoutLog(date, 'Tuesday', '', [
        { exerciseId: exercise.id, setNumber: 1, weight: 80, reps: 8 },
      ]);
    }

    const tree = await renderDashboard();
    expect(renderedText(tree)).not.toContain('Top 5 Streaks of All Time');

    await tap(tree, 'View top streaks');

    const text = renderedText(tree);
    expect(text).toContain('Top 5 Streaks of All Time');
    expect(text).toContain('#1 — 3 Days');
    expect(text).toContain('More streaks to come');
  });

  it('shows the running streak count on the badge', async () => {
    const exercise = await db.addExercise('Bench Press', 'Chest');
    await db.saveWorkoutLog(formatISODate(new Date()), 'Tuesday', '', [
      { exerciseId: exercise.id, setNumber: 1, weight: 80, reps: 8 },
    ]);

    const tree = await renderDashboard();

    expect(renderedText(tree)).toContain('1 Day Streak');
  });

  it('holds its SQLite reads back until store initialization reports done', async () => {
    const exercise = await db.addExercise('Bench Press', 'Chest');
    await db.saveWorkoutLog(formatISODate(new Date()), 'Tuesday', '', [
      { exerciseId: exercise.id, setNumber: 1, weight: 80, reps: 8 },
    ]);

    // The store is still initializing (App shows its splash in this window),
    // so the dashboard must not touch the connection yet — the data is there,
    // it simply stays unread.
    useAppStore.setState({ isLoading: true });
    const tree = await renderDashboard();
    expect(renderedText(tree)).toContain('0 Day Streak');

    // Initialization settles -> the pending read runs and the real number lands
    await act(async () => {
      useAppStore.setState({ isLoading: false });
    });
    expect(renderedText(tree)).toContain('1 Day Streak');
  });
});
