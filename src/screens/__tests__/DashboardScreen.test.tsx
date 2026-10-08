/**
 * UI tests for the dashboard header, verifying that the streak badge opens the
 * all-time streak history sheet. The data layer runs against the manual
 * `expo-sqlite` mock (in-memory SQLite), so the rendered numbers are real.
 */
import { StyleSheet, Text } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import DashboardScreen from '../DashboardScreen';
import * as db from '../../services/database';
import { useAppStore } from '../../store/useAppStore';
import { formatISODate } from '../../utils/dateUtils';
import { COLORS } from '../../theme/colors';
import { format } from 'date-fns';

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

/** Every node carrying the given testID (host and composite wrappers included). */
function nodesWithTestId(tree: ReactTestRenderer, testID: string) {
  return tree.root.findAll((node) => node.props?.testID === testID);
}

/** Flattened style of a node, so style arrays can be read like plain objects. */
function flatStyle(node: { props?: { style?: unknown } }): Record<string, unknown> {
  return (StyleSheet.flatten(node.props?.style as never) ?? {}) as Record<string, unknown>;
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

describe('DashboardScreen', () => {
  beforeEach(async () => {
    const handle = await db.getDB();
    await handle.execAsync(
      'DELETE FROM workout_sets; DELETE FROM day_templates; DELETE FROM workout_logs; DELETE FROM exercises; DELETE FROM weekly_split;'
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

  describe('streak badge', () => {
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

  describe('month compliance calendar', () => {
    /** Any day of the current month that is not today (for the empty marker). */
    function otherDayOfMonth(today: Date): Date {
      return today.getDate() === 1
        ? new Date(today.getFullYear(), today.getMonth() + 1, 0) // last day of the month
        : new Date(today.getFullYear(), today.getMonth(), 1);
    }

    /** The day before today, when the current month has one. */
    function dayBefore(today: Date): Date | null {
      return today.getDate() > 1
        ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
        : null;
    }

    /** The day after today, when the current month has one. */
    function dayAfter(today: Date): Date | null {
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      return today.getDate() < lastDay
        ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        : null;
    }

    /** The marker slot a marker is rendered in — the box that aligns them. */
    function markerSlot(tree: ReactTestRenderer, testID: string) {
      const slot = nodesWithTestId(tree, testID)[0].parent;
      if (!slot) throw new Error(`marker ${testID} has no slot`);
      return flatStyle(slot);
    }

    it('heads the grid with the current month and Monday-first weekday initials', async () => {
      const tree = await renderDashboard();

      expect(renderedStrings(tree)).toContain(format(new Date(), 'MMMM yyyy'));
      expect(renderedStrings(tree)).toEqual(
        expect.arrayContaining(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])
      );
      // The 7-day strip it replaced is gone
      expect(renderedText(tree)).not.toContain("This Week's Compliance");
    });

    it('lays the whole month out in weekly rows, one cell per day', async () => {
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

      const tree = await renderDashboard();

      const weekRows = tree.root.findAll(
        (node) =>
          typeof node.props?.testID === 'string' && node.props.testID.startsWith('month-week-')
      );
      const rowCount = new Set(weekRows.map((node) => node.props.testID as string)).size;
      // A 28-day month starting on Monday needs 4 rows, a 31-day month starting
      // on the weekend needs 6 — the days are never dropped or spilled over.
      expect(rowCount).toBeGreaterThanOrEqual(4);
      expect(rowCount).toBeLessThanOrEqual(6);

      const dayIds = new Set(
        tree.root
          .findAll(
            (node) =>
              typeof node.props?.testID === 'string' &&
              /^month-day-\d{4}-\d{2}-\d{2}$/.test(node.props.testID)
          )
          .map((node) => node.props.testID as string)
      );
      expect(dayIds.size).toBe(daysInMonth);
      const isoDates = Array.from(dayIds)
        .map((id) => id.replace('month-day-', ''))
        .sort();
      expect(isoDates[0]).toBe(
        formatISODate(new Date(today.getFullYear(), today.getMonth(), 1))
      );
      expect(isoDates[isoDates.length - 1]).toBe(
        formatISODate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
      );
    });

    it('ticks logged days and leaves rest days faint, with one centre line for every marker', async () => {
      const today = new Date();
      const loggedDate = formatISODate(today);
      const restDate = formatISODate(otherDayOfMonth(today));
      const exercise = await db.addExercise('Bench Press', 'Chest');
      await db.saveWorkoutLog(loggedDate, 'Tuesday', '', [
        { exerciseId: exercise.id, setNumber: 1, weight: 80, reps: 8 },
      ]);

      const tree = await renderDashboard();

      expect(nodesWithTestId(tree, `month-day-check-${loggedDate}`).length).toBeGreaterThan(0);
      expect(nodesWithTestId(tree, `month-day-rest-${loggedDate}`)).toHaveLength(0);
      // No routine configured, so nothing is due or missed: the other days are
      // plain rest days rather than pending workouts.
      expect(nodesWithTestId(tree, `month-day-rest-${restDate}`).length).toBeGreaterThan(0);
      expect(nodesWithTestId(tree, `month-day-check-${restDate}`)).toHaveLength(0);
      expect(nodesWithTestId(tree, `month-day-due-${restDate}`)).toHaveLength(0);
      expect(nodesWithTestId(tree, `month-day-missed-${restDate}`)).toHaveLength(0);

      // The tick is the green one, the rest marker the faint one
      expect(
        nodesWithTestId(tree, `month-day-check-${loggedDate}`)[0].props.color
      ).toBe(COLORS.accentGreen);
      expect(flatStyle(nodesWithTestId(tree, `month-day-rest-${restDate}`)[0]).backgroundColor).toBe(
        COLORS.border
      );

      // Both kinds render inside the same fixed-height, centred slot, so a 13px
      // tick and a 4px dot share one axis instead of sitting at different
      // heights.
      const tickSlot = markerSlot(tree, `month-day-check-${loggedDate}`);
      const restSlot = markerSlot(tree, `month-day-rest-${restDate}`);
      expect(tickSlot.height).toBe(restSlot.height);
      expect(tickSlot.justifyContent).toBe('center');
      expect(restSlot.justifyContent).toBe('center');
    });

    it('marks a missed routine day in red and an open one in grey', async () => {
      const today = new Date();
      const yesterday = dayBefore(today);
      const tomorrow = dayAfter(today);
      // A routine that trains every day, so nothing is a rest day and the
      // markers are driven purely by the plan against what was logged. Written
      // through the store, which is what the dashboard reads its split from.
      await useAppStore.getState().updateSplit({
        Monday: ['mg_chest'],
        Tuesday: ['mg_chest'],
        Wednesday: ['mg_chest'],
        Thursday: ['mg_chest'],
        Friday: ['mg_chest'],
        Saturday: ['mg_chest'],
        Sunday: ['mg_chest'],
      });

      const tree = await renderDashboard();
      const todayStr = formatISODate(today);

      // Today is scheduled and still open, so it is never marked as a miss
      expect(nodesWithTestId(tree, `month-day-due-${todayStr}`).length).toBeGreaterThan(0);
      expect(flatStyle(nodesWithTestId(tree, `month-day-due-${todayStr}`)[0]).backgroundColor).toBe(
        COLORS.textMuted
      );
      expect(nodesWithTestId(tree, `month-day-missed-${todayStr}`)).toHaveLength(0);

      if (yesterday) {
        const missedStr = formatISODate(yesterday);
        expect(nodesWithTestId(tree, `month-day-missed-${missedStr}`).length).toBeGreaterThan(0);
        expect(
          flatStyle(nodesWithTestId(tree, `month-day-missed-${missedStr}`)[0]).backgroundColor
        ).toBe(COLORS.accentRed);
      }
      if (tomorrow) {
        expect(
          nodesWithTestId(tree, `month-day-due-${formatISODate(tomorrow)}`).length
        ).toBeGreaterThan(0);
      }
    });

    it("draws a missed day as the tick's own circle, red with a white cross", async () => {
      const today = new Date();
      const yesterday = dayBefore(today);
      if (!yesterday) return;

      // A routine that trains every day, with today logged: the grid then holds
      // a green tick and a red missed badge side by side, which is what makes
      // the two markers comparable.
      await useAppStore.getState().updateSplit({
        Monday: ['mg_chest'],
        Tuesday: ['mg_chest'],
        Wednesday: ['mg_chest'],
        Thursday: ['mg_chest'],
        Friday: ['mg_chest'],
        Saturday: ['mg_chest'],
        Sunday: ['mg_chest'],
      });
      const exercise = await db.addExercise('Bench Press', 'Chest');
      await db.saveWorkoutLog(formatISODate(today), 'Tuesday', '', [
        { exerciseId: exercise.id, setNumber: 1, weight: 80, reps: 8 },
      ]);

      const tree = await renderDashboard();

      const tick = nodesWithTestId(tree, `month-day-check-${formatISODate(today)}`)[0];
      const badge = nodesWithTestId(tree, `month-day-missed-${formatISODate(yesterday)}`)[0];
      const badgeStyle = flatStyle(badge);
      const diameter = badgeStyle.width as number;

      // The tick's own diameter — Ionicons draws checkmark-circle's disc across
      // 416 of its 512 glyph units, which is what the badge has to match.
      expect(diameter).toBe((tick.props.size * 416) / 512);
      expect(badgeStyle.height).toBe(diameter);
      expect(badgeStyle.borderRadius).toBe(diameter / 2);
      // Red fill, with the cross centred inside it
      expect(badgeStyle.backgroundColor).toBe(COLORS.accentRed);
      expect(badgeStyle.alignItems).toBe('center');
      expect(badgeStyle.justifyContent).toBe('center');
      const cross = badge.findAll((node) => node.props?.name === 'close');
      expect(cross.length).toBeGreaterThan(0);
      expect(cross[0].props.color).toBe('#ffffff');
      expect(cross[0].props.size).toBeLessThan(diameter);
    });

    it('rings today, and keeps the ring while today is also the selected day', async () => {
      const todayStr = formatISODate(new Date());
      const emptyDate = formatISODate(otherDayOfMonth(new Date()));

      const tree = await renderDashboard();

      const hasTodayRing = (testID: string) =>
        nodesWithTestId(tree, testID).some(
          (cell) =>
            cell.findAll((node) => flatStyle(node).borderColor === COLORS.accentBlue).length > 0
        );

      expect(hasTodayRing(`month-day-${todayStr}`)).toBe(true);
      expect(hasTodayRing(`month-day-${emptyDate}`)).toBe(false);
    });

    it('gives the day routine card breathing room below the calendar', async () => {
      const tree = await renderDashboard();

      const routineCard = tree.root.findAll(
        (node) =>
          flatStyle(node).marginTop === 24 && flatStyle(node).backgroundColor === COLORS.bgCard
      );
      expect(routineCard.length).toBeGreaterThan(0);
    });
  });
});
