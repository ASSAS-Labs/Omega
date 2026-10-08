/**
 * UI behavior tests for the all-time streak history sheet.
 *
 * The modal loads its own data, so these tests run the real data layer (the
 * manual `expo-sqlite` mock backed by in-memory SQLite) and assert what the
 * user actually sees: ranked streak rows plus the prompt for vacant positions.
 */
import { Text } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { format } from 'date-fns';
import StreakHistoryModal from '../StreakHistoryModal';
import * as db from '../../services/database';

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

/** Joined text of every row, so `#1 — 5 Days` can be asserted as one string. */
function renderedText(tree: ReactTestRenderer): string {
  return renderedStrings(tree).join('');
}

async function renderModal(overrides: { visible?: boolean; onClose?: () => void } = {}) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <StreakHistoryModal
        visible={overrides.visible ?? true}
        onClose={overrides.onClose ?? (() => {})}
      />
    );
  });
  return tree;
}

async function seedWorkoutDays(dates: string[]): Promise<void> {
  for (const date of dates) {
    await db.saveWorkoutLog(date, 'Tuesday', '', []);
  }
}

const VACANT_POSITION_TEXT = 'More streaks to come';
const CURRENT_STREAK_LABEL = 'Current Streak';

/** ISO date string `daysAgo` days before today, so "live" streaks stay live. */
function daysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return format(date, 'yyyy-MM-dd');
}

/** `count` consecutive days ending `endDaysAgo` days before today, oldest first. */
function runOfDays(count: number, endDaysAgo: number): string[] {
  return Array.from({ length: count }, (_, offset) => daysAgo(endDaysAgo + (count - 1 - offset)));
}

/** The text rendered inside one ranked row of the sheet, as one string. */
function rowStrings(tree: ReactTestRenderer, rank: number): string {
  const row = tree.root.findByProps({ testID: `streak-row-${rank}` });
  return collectStrings(row.props.children).join('');
}

describe('StreakHistoryModal', () => {
  beforeEach(async () => {
    const handle = await db.getDB();
    await handle.execAsync(
      'DELETE FROM workout_sets; DELETE FROM day_templates; DELETE FROM workout_logs; DELETE FROM exercises; DELETE FROM weekly_split;'
    );
  });

  it('ranks the longest streaks first and fills the remaining slots with a prompt', async () => {
    // 5 consecutive days, then a 2-day run
    await seedWorkoutDays([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-08',
      '2026-08-09',
    ]);

    const tree = await renderModal();
    const text = renderedText(tree);

    expect(text).toContain('Top 5 Streaks of All Time');
    expect(text).toContain('#1 — 5 Days');
    expect(text).toContain('#2 — 2 Days');

    const prompts = renderedStrings(tree).filter((s) => s === VACANT_POSITION_TEXT);
    expect(prompts).toHaveLength(3);

    await act(async () => tree.unmount());
  });

  it('uses the singular day label for a one-day streak', async () => {
    await seedWorkoutDays(['2026-08-01']);

    const tree = await renderModal();

    expect(renderedText(tree)).toContain('#1 — 1 Day');

    await act(async () => tree.unmount());
  });

  it('prompts for all five positions when nothing has been logged yet', async () => {
    const tree = await renderModal();

    const strings = renderedStrings(tree);
    expect(strings.filter((s) => s === VACANT_POSITION_TEXT)).toHaveLength(5);
    expect(strings.some((s) => s.startsWith('#'))).toBe(false);
    // A fresh install has no live streak to badge either
    expect(strings).not.toContain(CURRENT_STREAK_LABEL);

    await act(async () => tree.unmount());
  });

  it('badges the streak that is still running in the rank it earned', async () => {
    // A long block 40 days back, plus a live run ending today
    await seedWorkoutDays([...runOfDays(6, 40), ...runOfDays(3, 0)]);

    const tree = await renderModal();

    expect(rowStrings(tree, 1)).toContain('#1 — 6 Days');
    expect(rowStrings(tree, 1)).not.toContain(CURRENT_STREAK_LABEL);
    expect(rowStrings(tree, 2)).toContain('#2 — 3 Days');
    expect(rowStrings(tree, 2)).toContain(CURRENT_STREAK_LABEL);
    expect(renderedStrings(tree).filter((s) => s === CURRENT_STREAK_LABEL)).toHaveLength(1);

    await act(async () => tree.unmount());
  });

  it('labels a live streak that is tied with an older run of the same length', async () => {
    await seedWorkoutDays([...runOfDays(3, 40), ...runOfDays(3, 0)]);

    const tree = await renderModal();

    expect(rowStrings(tree, 1)).toContain('#1 — 3 Days');
    expect(rowStrings(tree, 1)).toContain(CURRENT_STREAK_LABEL);
    expect(rowStrings(tree, 2)).toContain('#2 — 3 Days');
    expect(rowStrings(tree, 2)).not.toContain(CURRENT_STREAK_LABEL);
    expect(renderedStrings(tree).filter((s) => s === CURRENT_STREAK_LABEL)).toHaveLength(1);

    await act(async () => tree.unmount());
  });

  it('leaves a run that has already been broken unlabelled', async () => {
    // Three straight days, but the last one was five days ago: no live streak
    await seedWorkoutDays(runOfDays(3, 5));

    const tree = await renderModal();

    expect(rowStrings(tree, 1)).toContain('#1 — 3 Days');
    expect(renderedStrings(tree)).not.toContain(CURRENT_STREAK_LABEL);

    await act(async () => tree.unmount());
  });

  it('gives a live run that is too short to rank a row of its own', async () => {
    // Five long runs sit above a single day logged today
    await seedWorkoutDays([
      ...runOfDays(6, 60),
      ...runOfDays(5, 50),
      ...runOfDays(4, 40),
      ...runOfDays(3, 30),
      ...runOfDays(2, 20),
      daysAgo(0),
    ]);

    const tree = await renderModal();

    expect(rowStrings(tree, 5)).toContain('#5 — 2 Days');
    expect(renderedStrings(tree)).not.toContain(VACANT_POSITION_TEXT);

    // The board is full, so the live run keeps a row of its own below it: the
    // header badge shows that number, so the sheet must not hide it.
    const liveRow = tree.root.findByProps({ testID: 'streak-current-row' });
    const liveText = collectStrings(liveRow.props.children).join('');
    expect(liveText).toContain('1 Day');
    expect(liveText).toContain(CURRENT_STREAK_LABEL);
    expect(renderedStrings(tree).filter((s) => s === CURRENT_STREAK_LABEL)).toHaveLength(1);

    await act(async () => tree.unmount());
  });

  it('measures the live run with the split, so rest days never end it', async () => {
    // One training day a week (today's weekday), so every day in between is a
    // rest day. Under the old calendar-day rule this live run would read 0.
    const today = new Date();
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ] as const;
    await db.saveWeeklySplit({
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
      [dayNames[today.getDay()]]: ['mg_chest'],
    });
    await seedWorkoutDays([daysAgo(3), daysAgo(0)]);

    const tree = await renderModal();

    expect(rowStrings(tree, 1)).toContain('#1 — 2 Days');
    expect(rowStrings(tree, 1)).toContain(CURRENT_STREAK_LABEL);
    expect(tree.root.findAllByProps({ testID: 'streak-current-row' })).toHaveLength(0);

    await act(async () => tree.unmount());
  });

  it('counts multiple sessions on the same day as a single streak day', async () => {
    // Two sessions on Aug 1, then Aug 2 and Aug 3
    await seedWorkoutDays(['2026-08-01', '2026-08-01', '2026-08-02', '2026-08-03']);

    const tree = await renderModal();

    expect(renderedText(tree)).toContain('#1 — 3 Days');

    await act(async () => tree.unmount());
  });

  it('closes through the (X) button', async () => {
    const onClose = jest.fn();
    const tree = await renderModal({ onClose });

    const closeButton = tree.root.findByProps({ accessibilityLabel: 'Close streak history' });
    await act(async () => {
      closeButton.props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => tree.unmount());
  });

  it('renders nothing while it is hidden', async () => {
    const tree = await renderModal({ visible: false });

    expect(tree.toJSON()).toBeNull();
    expect(tree.root.findAllByType(Text)).toHaveLength(0);

    await act(async () => tree.unmount());
  });
});
