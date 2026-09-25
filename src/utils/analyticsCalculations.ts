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
 * Maximum number of buckets plotted at once. The chart is rendered at a fixed
 * width without horizontal scrolling, so it fits roughly 8 points at the
 * minimum spacing of 35px — more than that would overlap and clip.
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
