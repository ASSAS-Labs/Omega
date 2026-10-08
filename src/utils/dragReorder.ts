/**
 * Geometry for a vertically reorderable list of variable-height rows.
 *
 * The math is kept free of any React Native dependency so the drag behaviour of
 * the routine builder can be covered by fast unit tests: the screen only feeds
 * it the measured row heights and the dragged row's finger-driven centre, and
 * gets back the index the row currently belongs at.
 */

/**
 * Height assumed for a row that has not reported its layout yet (the first
 * frame, before `onLayout` lands). Only affects a drag started in that window.
 */
export const DEFAULT_ROW_HEIGHT = 132;

/** Distance between two consecutive rows (mirrors the list's `gap` style). */
export const ROW_GAP = 24;

/**
 * Distance from the top of the list to the top of the row at `index`, i.e. the
 * sum of every preceding row plus one gap per row boundary.
 */
export function computeRowTop(heights: number[], index: number, gap: number = ROW_GAP): number {
  let top = 0;
  for (let i = 0; i < index && i < heights.length; i++) {
    top += heights[i] + gap;
  }
  return top;
}

/**
 * Vertical centre of every slot, in the order given.
 *
 * Dragging keeps a row's centre under the finger, so this is the reference the
 * drag offset is measured against.
 */
export function computeSlotCenters(
  heights: number[],
  gap: number = ROW_GAP
): number[] {
  let top = 0;
  return heights.map((height) => {
    const center = top + height / 2;
    top += height + gap;
    return center;
  });
}

/**
 * Vertical centre of the slot at `index`: where a row of that height sits when
 * it is resting in place.
 */
export function computeSlotCenter(
  heights: number[],
  index: number,
  gap: number = ROW_GAP
): number {
  const height = heights[index] ?? DEFAULT_ROW_HEIGHT;
  return computeRowTop(heights, index, gap) + height / 2;
}

/**
 * Index the dragged row should occupy given the position of its centre.
 *
 * The row swaps with a neighbour once it has travelled past the midpoint
 * between the two slots, which is how a reorderable list is expected to feel:
 * half a row of travel in either direction is enough to take the neighbour's
 * place, and a drag that stops right on a midpoint stays where it already is —
 * the same threshold therefore has to be crossed again to swap back, so a row
 * held at a boundary cannot oscillate between two slots.
 *
 * @param heights       - Measured heights, in the list's current order
 * @param fromIndex     - Index the dragged row currently occupies
 * @param draggedCenter - Centre of the dragged row, as driven by the finger
 * @param gap           - Distance between two consecutive rows
 */
export function computeDropIndex(
  heights: number[],
  fromIndex: number,
  draggedCenter: number,
  gap: number = ROW_GAP
): number {
  const centers = computeSlotCenters(heights, gap);

  let target = Math.max(0, Math.min(fromIndex, centers.length - 1));
  // Down: one slot per midpoint the row has passed
  while (target < centers.length - 1 && draggedCenter > (centers[target] + centers[target + 1]) / 2) {
    target += 1;
  }
  // Up: the mirror rule, so the same boundary has to be crossed back
  while (target > 0 && draggedCenter < (centers[target - 1] + centers[target]) / 2) {
    target -= 1;
  }
  return target;
}

/** Moves one item inside a list, returning a new array. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return items.slice();

  const clampedTo = Math.max(0, Math.min(items.length - 1, to));
  const reordered = items.slice();
  const [moved] = reordered.splice(from, 1);
  reordered.splice(clampedTo, 0, moved);
  return reordered;
}
