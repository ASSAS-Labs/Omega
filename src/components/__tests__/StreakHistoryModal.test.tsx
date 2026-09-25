/**
 * UI behavior tests for the all-time streak history sheet.
 *
 * The modal loads its own data, so these tests run the real data layer (the
 * manual `expo-sqlite` mock backed by in-memory SQLite) and assert what the
 * user actually sees: ranked streak rows plus the prompt for vacant positions.
 */
import { Text } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
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

describe('StreakHistoryModal', () => {
  beforeEach(async () => {
    const handle = await db.getDB();
    await handle.execAsync(
      'DELETE FROM workout_sets; DELETE FROM day_templates; DELETE FROM workout_logs; DELETE FROM exercises;'
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
