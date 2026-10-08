import type { ViewStyle } from 'react-native';

/**
 * Global grid rule for structured data tables
 * -------------------------------------------
 * A table's header row and every one of its item rows MUST be laid out from one
 * shared column definition. Mixing layout systems (a `space-between` header
 * against pixel-width cells, or percentage/padding offsets applied on one side
 * only) is what lets a label drift off the centre line of the cell it
 * describes, so it is not allowed: both rows read the tokens below, and nothing
 * else in a table row sets column geometry.
 */
export const SET_COLUMN_WIDTHS = {
  /** 'SET' label and the row index ("1", "2", ...). */
  setNumber: 36,
  /** Responsive fill for the previous-session benchmark ("47.5 kg × 6"). */
  previous: 'flex: 1',
  /** 'WEIGHT (KG)' label and the weight input pill. */
  weight: 80,
  /** 'REPS' label and the reps input pill. */
  reps: 64,
  /** Delete-mode / status slot, rendered in both rows only while it is shown. */
  action: 28,
  /** Uniform horizontal spacing between every pair of columns. */
  columnGap: 10,
} as const;

/** A column width from {@link SET_COLUMN_WIDTHS}: fixed pixels, or the flex fill. */
export type SetColumnWidth = number | typeof SET_COLUMN_WIDTHS.previous;

/**
 * Translates an `SET_COLUMN_WIDTHS` token into React Native geometry. The
 * header label and the cell below it call this with the same token, which is
 * what keeps their horizontal centre lines coincident.
 */
export function columnGeometry(width: SetColumnWidth): ViewStyle {
  return width === 'flex: 1' ? { flex: 1 } : { width };
}
