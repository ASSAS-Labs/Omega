/**
 * Unit tests for the reorder geometry behind the routine builder's
 * drag-to-reorder: the screen feeds measured row heights in and gets the slot
 * the dragged row currently belongs at back.
 */
import {
  computeDropIndex,
  computeRowTop,
  computeSlotCenter,
  DEFAULT_ROW_HEIGHT,
  moveItem,
  ROW_GAP,
} from '../dragReorder';

describe('dragReorder geometry', () => {
  describe('computeRowTop', () => {
    it('sums the rows above, one gap per boundary', () => {
      const heights = [100, 120, 90];

      expect(computeRowTop(heights, 0, 20)).toBe(0);
      expect(computeRowTop(heights, 1, 20)).toBe(120); // 100 + 20
      expect(computeRowTop(heights, 2, 20)).toBe(260); // 100 + 20 + 120 + 20
    });

    it('counts the gaps only for rows past the measured list', () => {
      expect(computeRowTop([100], 2, 20)).toBe(120);
    });
  });

  describe('computeSlotCenter', () => {
    it('centres a row inside its own slot', () => {
      const heights = [100, 120, 90];

      expect(computeSlotCenter(heights, 0, 20)).toBe(50);
      expect(computeSlotCenter(heights, 1, 20)).toBe(180); // 120 + 60
      expect(computeSlotCenter(heights, 2, 20)).toBe(305); // 260 + 45
    });

    it('assumes a default height for a row that has not been laid out yet', () => {
      expect(computeSlotCenter([], 0, 20)).toBe(DEFAULT_ROW_HEIGHT / 2);
    });
  });

  describe('computeDropIndex', () => {
    // Three 100px rows at ROW_GAP 24 => slot centres 50 / 174 / 298, so the
    // boundaries between neighbouring slots sit at 112 and 236.
    const heights = [100, 100, 100];

    it('keeps the card in its own slot when the finger has not moved it past a neighbour', () => {
      for (const from of [0, 1, 2]) {
        expect(computeDropIndex(heights, from, computeSlotCenter(heights, from), ROW_GAP)).toBe(from);
      }
    });

    it('swaps down once the card has travelled past the midpoint of the next slot', () => {
      expect(computeDropIndex(heights, 0, 112, ROW_GAP)).toBe(0);
      expect(computeDropIndex(heights, 0, 113, ROW_GAP)).toBe(1);
      expect(computeDropIndex(heights, 0, 236, ROW_GAP)).toBe(1);
      expect(computeDropIndex(heights, 0, 237, ROW_GAP)).toBe(2);
    });

    it('swaps up once the card has travelled past the midpoint of the previous slot', () => {
      expect(computeDropIndex(heights, 2, 236, ROW_GAP)).toBe(2);
      expect(computeDropIndex(heights, 2, 235, ROW_GAP)).toBe(1);
      expect(computeDropIndex(heights, 2, 112, ROW_GAP)).toBe(1);
      expect(computeDropIndex(heights, 2, 111, ROW_GAP)).toBe(0);
    });

    it('holds the boundary rather than oscillating between two slots', () => {
      // Sitting exactly on the midpoint keeps the current slot...
      expect(computeDropIndex(heights, 0, 112, ROW_GAP)).toBe(0);
      expect(computeDropIndex(heights, 1, 112, ROW_GAP)).toBe(1);
      // ...and one pixel further is what swaps
      expect(computeDropIndex(heights, 0, 113, ROW_GAP)).toBe(1);
      expect(computeDropIndex(heights, 1, 111, ROW_GAP)).toBe(0);
    });

    it('reaches the end slots when the card is dragged past every other row', () => {
      expect(computeDropIndex(heights, 0, Number.MAX_SAFE_INTEGER, ROW_GAP)).toBe(2);
      expect(computeDropIndex(heights, 2, -Number.MAX_SAFE_INTEGER, ROW_GAP)).toBe(0);
    });

    it('handles rows of different heights', () => {
      // 90 / 120 / 70 tall => centres 45 / 174 / 293, midpoints 109.5 / 233.5
      const mixed = [90, 120, 70];

      expect(computeDropIndex(mixed, 1, 109, ROW_GAP)).toBe(0);
      expect(computeDropIndex(mixed, 1, 110, ROW_GAP)).toBe(1);
      expect(computeDropIndex(mixed, 1, 233, ROW_GAP)).toBe(1);
      expect(computeDropIndex(mixed, 1, 234, ROW_GAP)).toBe(2);
    });
  });

  describe('moveItem', () => {
    const items = ['a', 'b', 'c', 'd'];

    it('moves an item down and up without losing or duplicating entries', () => {
      expect(moveItem(items, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
      expect(moveItem(items, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    });

    it('leaves the list untouched when the target is its own index', () => {
      expect(moveItem(items, 2, 2)).toEqual(items);
    });

    it('returns a copy rather than mutating the input', () => {
      const moved = moveItem(items, 1, 3);

      expect(moved).not.toBe(items);
      expect(items).toEqual(['a', 'b', 'c', 'd']);
    });

    it('ignores an out-of-range source index', () => {
      expect(moveItem(items, 9, 0)).toEqual(items);
      expect(moveItem(items, -1, 0)).toEqual(items);
    });

    it('clamps a target index past the end of the list', () => {
      expect(moveItem(items, 0, 99)).toEqual(['b', 'c', 'd', 'a']);
    });

    it('drops the card on the slot computeDropIndex reported', () => {
      const heights = [90, 120, 70];
      const names = ['bench', 'fly', 'dip'];
      const heightsById: Record<string, number> = { bench: 90, fly: 120, dip: 70 };

      // Drag the first card down past the midpoint of the second slot (109.5)
      const draggedCenter = 140;
      const target = computeDropIndex(heights, 0, draggedCenter, ROW_GAP);
      const reordered = moveItem(names, 0, target);

      expect(target).toBe(1);
      expect(reordered).toEqual(['fly', 'bench', 'dip']);

      // Re-measuring the moved card against its new neighbours keeps it exactly
      // where it landed, so the drag never oscillates between two slots
      const reorderedHeights = reordered.map((name) => heightsById[name]);
      expect(computeDropIndex(reorderedHeights, target, draggedCenter, ROW_GAP)).toBe(target);
    });
  });
});
