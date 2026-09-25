/**
 * UI tests for the analytics screen, covering the header layout contract and
 * the dynamic filter aggregation that feeds the progression chart.
 *
 * `react-native-gifted-charts` is replaced by a thin double that renders the
 * props it receives, so the chart data/labels/axis bounds produced by the
 * screen are asserted directly (the chart library itself is a rendering
 * concern, and its internal animation timers are hostile to a jsdom-free test
 * environment). `useFocusEffect` is re-implemented on top of `useEffect` so the
 * screen's data loading runs without a navigation container.
 */
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import AnalyticsScreen from '../AnalyticsScreen';
import * as db from '../../services/database';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => void) => {
    const ReactModule = require('react');
    ReactModule.useEffect(callback, [callback]);
  },
}));

jest.mock('react-native-gifted-charts', () => ({
  LineChart: (props: Record<string, unknown>) => {
    const { View: ViewComponent } = require('react-native');
    return <ViewComponent testID="line-chart" {...props} />;
  },
}));

interface ChartPoint {
  value: number;
  label: string;
  labelComponent: () => React.ReactElement<{ label: string; yearLabel: string }>;
}

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

async function renderAnalytics(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<AnalyticsScreen />);
  });
  renderedTrees.push(tree);
  return tree;
}

/** Reads the data the screen handed to the chart. */
function chartPoints(tree: ReactTestRenderer): ChartPoint[] {
  return tree.root.findByProps({ testID: 'line-chart' }).props.data as ChartPoint[];
}

function chartProps(tree: ReactTestRenderer): Record<string, any> {
  return tree.root.findByProps({ testID: 'line-chart' }).props;
}

/** Renders a chart point's custom x-axis label and returns its visible lines. */
async function axisLabelLines(point: ChartPoint): Promise<string[]> {
  let labelTree!: ReactTestRenderer;
  await act(async () => {
    labelTree = create(point.labelComponent());
  });
  const lines = renderedStrings(labelTree);
  await act(async () => labelTree.unmount());
  return lines;
}

async function pressPill(tree: ReactTestRenderer, label: string): Promise<void> {
  const pill = tree.root
    .findAllByType(TouchableOpacity)
    .find((node) => collectStrings(node.props.children).join('') === label);
  expect(pill).toBeDefined();
  await act(async () => {
    pill?.props.onPress?.();
  });
}

async function seedSessions(): Promise<void> {
  const exercise = await db.addExercise('Cable forearm extensor', 'Forearms');
  const sessions: [string, number, number][] = [
    // Week of Mon Aug 31 - Sun Sep 6
    ['2026-08-31', 40, 10],
    ['2026-09-02', 45, 10],
    // Week of Mon Sep 7 - Sun Sep 13
    ['2026-09-08', 42.5, 12],
  ];
  for (const [date, weight, reps] of sessions) {
    await db.saveWorkoutLog(date, 'Tuesday', '', [
      { exerciseId: exercise.id, setNumber: 1, weight, reps },
    ]);
  }
}

describe('AnalyticsScreen', () => {
  beforeEach(async () => {
    const handle = await db.getDB();
    await handle.execAsync(
      'DELETE FROM workout_sets; DELETE FROM day_templates; DELETE FROM workout_logs; DELETE FROM exercises;'
    );
    // SafeAreaView's deprecation notice from react-native adds noise only
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    for (const tree of renderedTrees.splice(0)) {
      await act(async () => tree.unmount());
    }
    jest.restoreAllMocks();
  });

  describe('filter selection', () => {
    it('defaults to the SESSION filter and plots one point per logged session', async () => {
      await seedSessions();

      const tree = await renderAnalytics();

      expect(chartPoints(tree).map((p) => [p.label, p.value])).toEqual([
        ['31 Aug', 40],
        ['2 Sep', 45],
        ['8 Sep', 42.5],
      ]);
    });

    it('groups sessions into Monday-Sunday weeks and plots each week peak', async () => {
      await seedSessions();

      const tree = await renderAnalytics();
      await pressPill(tree, 'WEEK');

      expect(chartPoints(tree).map((p) => [p.label, p.value])).toEqual([
        ['Wk 31 Aug', 45], // peak of the Aug 31 / Sep 2 sessions
        ['Wk 7 Sep', 42.5],
      ]);
    });

    it('groups sessions into calendar months and plots each monthly peak', async () => {
      await seedSessions();

      const tree = await renderAnalytics();
      await pressPill(tree, 'MONTH');

      expect(chartPoints(tree).map((p) => [p.label, p.value])).toEqual([
        ['Aug', 40],
        ['Sep', 45],
      ]);
    });

    it('re-plots the dataset when switching back to SESSION', async () => {
      await seedSessions();

      const tree = await renderAnalytics();
      await pressPill(tree, 'MONTH');
      await pressPill(tree, 'SESSION');

      expect(chartPoints(tree)).toHaveLength(3);
    });
  });

  describe('chart axis', () => {
    it('renders two-line date labels with the apostrophe year', async () => {
      await seedSessions();

      const tree = await renderAnalytics();
      await pressPill(tree, 'WEEK');

      expect(await axisLabelLines(chartPoints(tree)[0])).toEqual(['Wk 31 Aug', "'26"]);
    });

    it('keeps 30% headroom above the tallest point so value labels never clip', async () => {
      await seedSessions();

      const tree = await renderAnalytics();

      const props = chartProps(tree);
      expect(props.overflowTop).toBe(30);
      // ceil(45 * 1.3)
      expect(props.maxValue).toBe(59);
    });

    it('plots the selected benchmark metric', async () => {
      await seedSessions();

      const tree = await renderAnalytics();
      const volumeToggle = tree.root
        .findAllByType(TouchableOpacity)
        .find((node) => collectStrings(node.props.children).join('') === 'Volume');
      await act(async () => {
        volumeToggle?.props.onPress?.();
      });

      // 40kg x 10 reps, 45kg x 10, 42.5kg x 12
      expect(chartPoints(tree).map((p) => p.value)).toEqual([400, 450, 510]);
    });
  });

  describe('header layout', () => {
    it('lets long exercise names wrap to two lines instead of crowding the toggle', async () => {
      await seedSessions();

      const tree = await renderAnalytics();

      const title = tree.root.findAll((node) => node.props?.ellipsizeMode === 'tail')[0];
      expect(title.props.numberOfLines).toBe(2);
      expect(collectStrings(title.props.children).join('')).toBe('Cable forearm extensor');
    });

    it('pins the metric toggle to the top right and never lets it shrink', async () => {
      await seedSessions();

      const tree = await renderAnalytics();

      const pinned = tree.root.findAll(
        (node) => node.props?.style?.flexShrink === 0 && node.props?.style?.alignSelf === 'flex-start'
      );
      expect(pinned.length).toBeGreaterThan(0);
    });
  });

  describe('streak badge', () => {
    it('opens the all-time streak history sheet from the current-streak block', async () => {
      await seedSessions();

      const tree = await renderAnalytics();
      expect(renderedStrings(tree).join('|')).not.toContain('Top 5 Streaks of All Time');

      await act(async () => {
        tree.root.findByProps({ accessibilityLabel: 'View top streaks' }).props.onPress();
      });

      expect(renderedStrings(tree).join('|')).toContain('Top 5 Streaks of All Time');
    });
  });
});
