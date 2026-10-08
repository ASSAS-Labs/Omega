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
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import AnalyticsScreen from '../AnalyticsScreen';
import * as db from '../../services/database';
import {
  CHART_EDGE_GUTTER,
  CHART_POINT_WIDTH,
  computePlotHeight,
  X_AXIS_LABELS_EXTRA_HEIGHT,
  X_AXIS_LABELS_VERTICAL_SHIFT,
  Y_AXIS_LANE_WIDTH,
  Y_AXIS_TICK_LINE_HEIGHT,
} from '../../utils/analyticsCalculations';
import { SPACING } from '../../theme/colors';

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

/** The screen's horizontal plot scroller with the given testID. */
function chartScroll(tree: ReactTestRenderer, testID: string) {
  const scroller = tree.root
    .findAllByType(ScrollView)
    .find((node) => node.props.testID === testID);
  expect(scroller).toBeDefined();
  return scroller!;
}

/** Props the screen handed to the chart inside the given scroller. */
function chartIn(tree: ReactTestRenderer, testID: string): Record<string, any> {
  const chart = chartScroll(tree, testID).findAllByProps({ testID: 'line-chart' })[0];
  expect(chart).toBeDefined();
  return chart.props;
}

/** Tick Texts of the frozen y-axis lane (they carry an absolute `top`). */
function yAxisTicks(tree: ReactTestRenderer) {
  return tree.root
    .findAllByType(Text)
    .filter((node) => typeof node.props.style?.[1]?.top === 'number');
}

async function tapControl(tree: ReactTestRenderer, accessibilityLabel: string): Promise<void> {
  const button = tree.root
    .findAllByType(TouchableOpacity)
    .find((node) => node.props.accessibilityLabel === accessibilityLabel);
  expect(button).toBeDefined();
  await act(async () => {
    button?.props.onPress?.();
  });
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

  describe('chart panning', () => {
    it('wraps the plot in a horizontal scroller that never shows a scroll bar', async () => {
      await seedSessions();

      const tree = await renderAnalytics();
      const scroller = chartScroll(tree, 'card-chart-scroll');

      expect(scroller.props.horizontal).toBe(true);
      expect(scroller.props.showsHorizontalScrollIndicator).toBe(false);
      expect(scroller.props.nestedScrollEnabled).toBe(true);
      expect(scroller.props.overScrollMode).toBe('never');
    });

    it('sizes the plot from its container and keeps the frozen axis lane out of it', async () => {
      await seedSessions();

      const tree = await renderAnalytics();

      const screenWidth = Dimensions.get('window').width;
      // Card inner width, minus the frozen lane that is rendered beside the plot
      const cardInnerWidth = screenWidth - SPACING.lg * 2 - SPACING.md * 2 - 2;
      const plotViewport = cardInnerWidth - Y_AXIS_LANE_WIDTH;
      const plotWidth = chartIn(tree, 'card-chart-scroll').width as number;

      // Three sessions still fit: the plot fills the card without dead space
      expect(plotWidth).toBe(
        Math.max(plotViewport, 3 * CHART_POINT_WIDTH - Y_AXIS_LANE_WIDTH)
      );
      // The lane always sits outside the plot, so the pair covers the card
      expect(plotWidth + Y_AXIS_LANE_WIDTH).toBeGreaterThanOrEqual(cardInnerWidth);

      // ...and the series uses the whole plot without pushing an end label out
      const spacing = chartIn(tree, 'card-chart-scroll').spacing as number;
      expect(spacing * 2 + CHART_EDGE_GUTTER * 2).toBeCloseTo(plotWidth, 5);
    });

    it('gives the maximized plot the wider fullscreen container', async () => {
      await seedSessions();

      const tree = await renderAnalytics();
      const cardWidth = chartIn(tree, 'card-chart-scroll').width as number;

      await tapControl(tree, 'Maximize chart');

      const fullscreen = chartScroll(tree, 'fullscreen-chart-scroll');
      expect(fullscreen.props.horizontal).toBe(true);
      expect(chartIn(tree, 'fullscreen-chart-scroll').width as number).toBeGreaterThan(cardWidth);
    });

    it('auto-scrolls to the newest session as soon as the plot is laid out', async () => {
      const scrollToEnd = jest.spyOn(ScrollView.prototype, 'scrollToEnd');
      await seedSessions();

      await renderAnalytics();

      expect(scrollToEnd).toHaveBeenCalledWith({ animated: false });
    });
  });

  describe('pinned y-axis', () => {
    it('draws the axis in a lane outside the pannable plot', async () => {
      await seedSessions();

      const tree = await renderAnalytics();

      // Ticks mirror the axis bound (ceil(45 * 1.3) = 59) down to zero
      expect(
        yAxisTicks(tree).map((node) => collectStrings(node.props.children).join(''))
      ).toEqual(['59', '44', '29', '14', '0']);

      // The chart hands its own in-plot labels over to that lane
      expect(chartIn(tree, 'card-chart-scroll').hideYAxisText).toBe(true);
      expect(chartIn(tree, 'card-chart-scroll').yAxisLabelWidth).toBe(0);

      // Every tick lives outside the plot's scroller, so panning can never hide it
      const plotScroller = chartScroll(tree, 'card-chart-scroll');
      for (const tick of yAxisTicks(tree)) {
        for (let ancestor = tick.parent; ancestor; ancestor = ancestor.parent) {
          expect(ancestor).not.toBe(plotScroller);
        }
      }

      // ...while the plot itself is the thing that scrolls
      expect(chartIn(tree, 'card-chart-scroll').data).toHaveLength(3);
    });
  });

  describe('bottom axis labels', () => {
    it('pushes the date labels down and reserves the extra height for them', async () => {
      await seedSessions();

      const tree = await renderAnalytics();
      const props = chartIn(tree, 'card-chart-scroll');

      expect(props.xAxisLabelsVerticalShift).toBe(X_AXIS_LABELS_VERTICAL_SHIFT);
      expect(props.labelsExtraHeight).toBe(X_AXIS_LABELS_EXTRA_HEIGHT);
      expect(props.xAxisLabelsHeight).toBe(40);

      // Same spacing in the maximized chart
      await tapControl(tree, 'Maximize chart');
      expect(chartIn(tree, 'fullscreen-chart-scroll').xAxisLabelsVerticalShift).toBe(
        X_AXIS_LABELS_VERTICAL_SHIFT
      );
    });

    it('sizes the lane so the baseline tick is never clipped by its own overflow', async () => {
      await seedSessions();

      const tree = await renderAnalytics();

      const ticks = yAxisTicks(tree);
      const lane = ticks[0].parent;
      expect(lane).not.toBeNull();

      const lowestTickBottom = Math.max(
        ...ticks.map(
          (tick) => (tick.props.style[1].top as number) + Y_AXIS_TICK_LINE_HEIGHT
        )
      );

      // The lane's `overflow: hidden` would cut the "0" label in half if it were
      // only as tall as the plot
      expect(StyleSheet.flatten(lane?.props.style).height).toBeGreaterThanOrEqual(lowestTickBottom);
    });

    it('keeps the axis line itself ending on the baseline', async () => {
      await seedSessions();

      const tree = await renderAnalytics();

      const axisLines = tree.root.findAll((node) => {
        const style = StyleSheet.flatten(node.props?.style);
        return style?.position === 'absolute' && style?.width === 1 && style?.height !== undefined;
      });

      // 220px card chart + the library's 1/20 headroom, and no more: the label
      // room the lane carries never stretches the rule below the baseline
      expect(axisLines.length).toBeGreaterThan(0);
      expect(StyleSheet.flatten(axisLines[0].props.style).height).toBe(computePlotHeight(220));
    });

    it('keeps the plot clear of the card edge so pushed-down labels cannot clip', async () => {
      await seedSessions();

      const tree = await renderAnalytics();

      const wrapper = tree.root.findAll((node) => {
        const style = StyleSheet.flatten(node.props?.style);
        return style?.paddingBottom === 6 && style?.marginVertical !== undefined;
      });

      expect(wrapper.length).toBeGreaterThan(0);
    });
  });

  describe('screen container', () => {
    it('does not bounce the main container into blank space', async () => {
      await seedSessions();

      const tree = await renderAnalytics();
      const verticalScrollers = tree.root
        .findAllByType(ScrollView)
        .filter((node) => node.props.horizontal !== true);

      expect(
        verticalScrollers.some(
          (node) => node.props.bounces === false && node.props.overScrollMode === 'never'
        )
      ).toBe(true);
    });
  });

  describe('maximized modal insets', () => {
    it('keeps its content clear of the status bar and the navigation bar', async () => {
      await seedSessions();

      const tree = await renderAnalytics();
      await tapControl(tree, 'Maximize chart');

      // Generous top padding on the modal sheet
      const modalSheet = tree.root.findAll(
        (node) => node.props?.style?.paddingTop === 56 && node.props?.style?.flex === 1
      );
      expect(modalSheet.length).toBeGreaterThan(0);

      const minimize = tree.root
        .findAllByType(TouchableOpacity)
        .find((node) => node.props.accessibilityLabel === 'Minimize chart');
      expect(minimize?.props.style.marginBottom).toBe(32);
    });
  });
});
