import { format, parseISO, startOfWeek } from 'date-fns';
import { formatISODate } from './dateUtils';

export type AnalyticsRange = 'session' | 'week' | 'month';
export type AnalyticsMetric = 'maxWeight' | 'totalVolume';

/** One logged session as returned by `getExerciseProgress`. */
export interface SessionProgressPoint {
  date: string; // YYYY-MM-DD
  maxWeight: number;
  totalVolume: number;
}

/** A single x-axis bucket plotted on the progression chart. */
export interface ChartBucket {
  /** Chronologically sortable bucket key (YYYY-MM-DD or YYYY-MM). */
  key: string;
  /** Top line of the two-line x-axis label, e.g. "21 Sep", "Wk 2 Sep", "Sep". */
  label: string;
  /** Bottom line of the x-axis label: apostrophe year, e.g. "'26". */
  yearLabel: string;
  /** Peak benchmark recorded inside the bucket for the selected metric. */
  value: number;
  /** Number of logged sessions aggregated into this bucket. */
  sessionCount: number;
}

/**
 * Maximum number of buckets plotted at once. The chart pans horizontally, so
 * this is a legibility/render-cost bound rather than a fit constraint: the most
 * recent 8 sessions (or weeks/months) are plotted, older ones are dropped.
 */
export const MAX_CHART_BUCKETS = 8;

/** Reads the selected metric from a session point, guarding against nulls. */
export function readMetricValue(
  point: SessionProgressPoint,
  metric: AnalyticsMetric
): number {
  const raw = metric === 'maxWeight' ? point?.maxWeight : point?.totalVolume;
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
}

/** Normalizes an arbitrary stored date string to a valid Date, or null. */
function parsePointDate(value: string): Date | null {
  const iso = formatISODate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const parsed = parseISO(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Monday-start of the ISO week containing `date` (weeks run Mon-Sun). */
function weekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Builds the primary (top line) label for a bucket:
 * - session -> "21 Sep" (the session day)
 * - week    -> "Wk 2 Sep" (Monday that starts the Monday-Sunday week)
 * - month   -> "Sep"
 */
function buildPrimaryLabel(bucketDate: Date, range: AnalyticsRange): string {
  if (range === 'month') return format(bucketDate, 'MMM');
  if (range === 'week') return `Wk ${format(bucketDate, 'd MMM')}`;
  return format(bucketDate, 'd MMM');
}

/**
 * Groups logged sessions into chart buckets and reduces each group to its peak
 * benchmark (best max weight or best volume), which is how progressive
 * overload is read over time.
 *
 * - `session`: one bucket per logged session, chronologically.
 * - `week`:    Monday-Sunday calendar weeks (Monday's date is the bucket key).
 * - `month`:   calendar months, keyed `yyyy-MM`.
 *
 * Buckets are returned oldest-first and capped to the most recent `maxBuckets`
 * so the fixed-width chart stays legible.
 *
 * @param points     - Raw per-session progress rows for one exercise
 * @param range      - Selected aggregation window
 * @param metric     - Selected benchmark (best weight or best volume)
 * @param maxBuckets - Maximum number of buckets to plot
 */
export function aggregateProgressByRange(
  points: SessionProgressPoint[],
  range: AnalyticsRange,
  metric: AnalyticsMetric,
  maxBuckets: number = MAX_CHART_BUCKETS
): ChartBucket[] {
  if (!points || !Array.isArray(points) || points.length === 0) {
    return [];
  }

  const buckets = new Map<
    string,
    { bucketDate: Date; key: string; value: number; sessionCount: number }
  >();

  for (const point of points) {
    const date = parsePointDate(point?.date);
    if (!date) continue;

    // Bucket identity + label anchor per range
    let bucketDate = date;
    let key = format(date, 'yyyy-MM-dd');
    if (range === 'week') {
      bucketDate = weekStart(date);
      key = format(bucketDate, 'yyyy-MM-dd');
    } else if (range === 'month') {
      bucketDate = new Date(date.getFullYear(), date.getMonth(), 1);
      key = format(bucketDate, 'yyyy-MM');
    }

    const value = readMetricValue(point, metric);
    const existing = buckets.get(key);

    if (existing) {
      // Peak benchmark wins — the chart reads best-effort progress per bucket
      existing.value = Math.max(existing.value, value);
      existing.sessionCount += 1;
    } else {
      buckets.set(key, { bucketDate, key, value, sessionCount: 1 });
    }
  }

  const limit = Math.max(1, maxBuckets);

  return Array.from(buckets.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-limit)
    .map((bucket) => ({
      key: bucket.key,
      label: buildPrimaryLabel(bucket.bucketDate, range),
      // date-fns escapes the apostrophe with a leading apostrophe pair
      yearLabel: format(bucket.bucketDate, "''yy"),
      value: bucket.value,
      sessionCount: bucket.sessionCount,
    }));
}

/**
 * Y-axis upper bound with 30% headroom, so data-point labels floating above the
 * topmost point are never clipped by the chart frame.
 */
export function computeChartMaxValue(values: number[]): number {
  const rawMax = Math.max(...(values.length > 0 ? values : [0]), 10);
  return Math.ceil(rawMax * 1.3);
}

// ---------------- Progression chart geometry ----------------

/** Horizontal room a single plotted session needs (point + stacked date label). */
export const CHART_POINT_WIDTH = 64;

/** Width of the frozen y-axis label lane drawn beside the scrollable plot. */
export const Y_AXIS_LANE_WIDTH = 40;

/** Gutter on each side of the series, so the end date labels stay in frame. */
export const CHART_EDGE_GUTTER = 36;

/** Line box of one y-axis tick (ticks are vertically centred on their rule). */
export const Y_AXIS_TICK_LINE_HEIGHT = 14;

/**
 * How far the bottom tick's line box reaches below the baseline: the "0" label
 * is centred on the baseline, so half of its box hangs underneath it. The lane
 * has to be this much taller than the plot or the label gets clipped.
 */
export const Y_AXIS_BASELINE_TICK_OVERHANG = Y_AXIS_TICK_LINE_HEIGHT / 2;

/**
 * Distance the x-axis date labels are pushed below the axis line
 * (`xAxisLabelsVerticalShift`), keeping them clear of the baseline and of the
 * "0" tick sitting on it.
 */
export const X_AXIS_LABELS_VERTICAL_SHIFT = 8;

/**
 * Extra spacing between the axis line and the stacked date labels
 * (`labelsExtraHeight`).
 *
 * This is the top-level knob for label-to-axis distance in this version of
 * `react-native-gifted-charts`: `labelsDistanceFromXaxis` only exists inside
 * the secondary-axis configuration, so the primary axis is spaced with
 * `labelsExtraHeight` instead.
 */
export const X_AXIS_LABELS_EXTRA_HEIGHT = 6;

/**
 * Width of the scrollable progression chart for `pointCount` sessions inside a
 * `containerWidth`-wide viewport: never narrower than the viewport, and
 * `CHART_POINT_WIDTH` px per session once the series outgrows it. Sessions are
 * never squeezed below that budget — the chart extends into a horizontally
 * pannable area instead, so the newest points cannot clip past the screen edge.
 */
export function computeChartWidth(containerWidth: number, pointCount: number): number {
  return Math.max(containerWidth, pointCount * CHART_POINT_WIDTH);
}

/**
 * Distance between two plotted sessions: the series is spread across the whole
 * plot, `CHART_EDGE_GUTTER` being kept on both sides so the first and last
 * two-line date labels are never clipped by the chart frame. A plot sized by
 * `computeChartWidth` therefore always leaves about `CHART_POINT_WIDTH` between
 * neighbouring points, so they cannot overlap.
 */
export function computePointSpacing(plotWidth: number, pointCount: number): number {
  const usable = Math.max(plotWidth - CHART_EDGE_GUTTER * 2, CHART_POINT_WIDTH);
  return usable / Math.max(pointCount - 1, 1);
}

/**
 * Vertical extent of the plot area inside a chart of `chartHeight`: the library
 * keeps `height / 20` of headroom above the topmost grid line, so the y-axis
 * runs from the top of the chart down to `chartHeight + chartHeight / 20`.
 */
export function computePlotHeight(chartHeight: number): number {
  return chartHeight + chartHeight / 20;
}

/**
 * Height of the frozen y-axis lane.
 *
 * The lane reproduces the library's axis geometry, so its ticks are laid out
 * against `computePlotHeight` — but it is that much taller than the plot, since
 * the bottom tick's line box is centred on the baseline and would otherwise be
 * clipped by the lane's own `overflow: hidden`. The axis line itself is drawn
 * separately, at exactly `computePlotHeight` tall, so the extra height is label
 * room only.
 */
export function computeYAxisLaneHeight(chartHeight: number): number {
  return computePlotHeight(chartHeight) + Y_AXIS_BASELINE_TICK_OVERHANG;
}

export interface YAxisTick {
  label: string;
  /** Vertical centre of the tick, measured down from the top of the chart. */
  centerY: number;
}

/**
 * Ticks for the frozen y-axis lane, mirroring the label geometry of the chart
 * library (which renders `noOfSections + 1` labels from the axis bound down to
 * 0, each centred on its grid line, the first one `height / 20` below the top).
 * The lane reproduces them outside the scroll area so the axis stays readable
 * while the sessions are panned.
 */
export function buildYAxisTicks(
  maxValue: number,
  noOfSections: number,
  chartHeight: number
): YAxisTick[] {
  const stepHeight = chartHeight / noOfSections;
  const stepValue = maxValue / noOfSections;
  const topInset = chartHeight / 20;
  return Array.from({ length: noOfSections + 1 }, (_, index) => ({
    // The library truncates rather than rounds its axis labels
    label: String(Math.trunc(maxValue - stepValue * index)),
    centerY: topInset + stepHeight * index,
  }));
}
