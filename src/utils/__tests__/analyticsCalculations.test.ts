import {
  aggregateProgressByRange,
  computeChartMaxValue,
  readMetricValue,
  MAX_CHART_BUCKETS,
  SessionProgressPoint,
} from '../analyticsCalculations';

/** Builds a per-session progress row the way `getExerciseProgress` returns it. */
function session(date: string, maxWeight: number, totalVolume: number): SessionProgressPoint {
  return { date, maxWeight, totalVolume };
}

describe('Analytics Calculations', () => {
  describe('readMetricValue', () => {
    it('reads the selected benchmark', () => {
      const point = session('2026-09-01', 85, 1150);
      expect(readMetricValue(point, 'maxWeight')).toBe(85);
      expect(readMetricValue(point, 'totalVolume')).toBe(1150);
    });

    it('treats missing, negative, and non-finite values as zero', () => {
      // @ts-expect-error - testing malformed runtime input
      expect(readMetricValue({ date: '2026-09-01' }, 'maxWeight')).toBe(0);
      expect(readMetricValue(session('2026-09-01', -10, 0), 'maxWeight')).toBe(0);
      expect(readMetricValue(session('2026-09-01', NaN, Infinity), 'totalVolume')).toBe(0);
    });
  });

  describe('SESSION aggregation', () => {
    it('plots one bucket per logged session, chronologically, with stacked labels', () => {
      const buckets = aggregateProgressByRange(
        [
          session('2026-09-21', 90, 720),
          session('2026-09-02', 85, 680),
          session('2026-09-14', 87.5, 700),
        ],
        'session',
        'maxWeight'
      );

      expect(buckets.map((b) => b.key)).toEqual(['2026-09-02', '2026-09-14', '2026-09-21']);
      expect(buckets.map((b) => b.label)).toEqual(['2 Sep', '14 Sep', '21 Sep']);
      expect(buckets.map((b) => b.yearLabel)).toEqual(["'26", "'26", "'26"]);
      expect(buckets.map((b) => b.value)).toEqual([85, 87.5, 90]);
      expect(buckets.every((b) => b.sessionCount === 1)).toBe(true);
    });

    it('plots the volume benchmark when that metric is selected', () => {
      const buckets = aggregateProgressByRange(
        [session('2026-09-02', 85, 680), session('2026-09-14', 87.5, 700)],
        'session',
        'totalVolume'
      );

      expect(buckets.map((b) => b.value)).toEqual([680, 700]);
    });

    it('keeps the chart legible by plotting only the most recent sessions', () => {
      const many = Array.from({ length: 15 }, (_, i) =>
        session(`2026-09-${String(i + 1).padStart(2, '0')}`, 50 + i, 500 + i)
      );

      const buckets = aggregateProgressByRange(many, 'session', 'maxWeight');

      expect(buckets).toHaveLength(MAX_CHART_BUCKETS);
      expect(buckets.map((b) => b.key)).toEqual([
        '2026-09-08',
        '2026-09-09',
        '2026-09-10',
        '2026-09-11',
        '2026-09-12',
        '2026-09-13',
        '2026-09-14',
        '2026-09-15',
      ]);
    });

    it('honors an explicit bucket limit', () => {
      const many = Array.from({ length: 6 }, (_, i) =>
        session(`2026-09-0${i + 1}`, 50 + i, 500)
      );

      expect(aggregateProgressByRange(many, 'session', 'maxWeight', 3)).toHaveLength(3);
    });
  });

  describe('WEEK aggregation (Monday-Sunday)', () => {
    it('groups sessions into ISO weeks and plots the peak benchmark of each week', () => {
      const buckets = aggregateProgressByRange(
        [
          // Week of Mon Aug 31 - Sun Sep 6
          session('2026-08-31', 80, 600),
          session('2026-09-02', 85, 640),
          session('2026-09-06', 82.5, 610),
          // Week of Mon Sep 7 - Sun Sep 13
          session('2026-09-08', 90, 720),
        ],
        'week',
        'maxWeight'
      );

      expect(buckets.map((b) => b.key)).toEqual(['2026-08-31', '2026-09-07']);
      expect(buckets.map((b) => b.label)).toEqual(['Wk 31 Aug', 'Wk 7 Sep']);
      expect(buckets.map((b) => b.yearLabel)).toEqual(["'26", "'26"]);
      expect(buckets.map((b) => b.value)).toEqual([85, 90]);
      expect(buckets.map((b) => b.sessionCount)).toEqual([3, 1]);
    });

    it('starts each week on Monday, so Sunday belongs to the preceding week', () => {
      const buckets = aggregateProgressByRange(
        [session('2026-09-06', 70, 400), session('2026-09-07', 95, 900)],
        'week',
        'maxWeight'
      );

      // Sunday Sep 6 -> week of Aug 31, Monday Sep 7 -> its own week
      expect(buckets.map((b) => b.key)).toEqual(['2026-08-31', '2026-09-07']);
      expect(buckets.map((b) => b.value)).toEqual([70, 95]);
    });

    it('picks the peak volume within a week when volume is selected', () => {
      const buckets = aggregateProgressByRange(
        [
          session('2026-08-31', 80, 1500),
          session('2026-09-02', 85, 900),
          session('2026-09-04', 82, 1200),
        ],
        'week',
        'totalVolume'
      );

      expect(buckets).toHaveLength(1);
      expect(buckets[0].value).toBe(1500);
      expect(buckets[0].sessionCount).toBe(3);
    });

    it('groups weeks that span a year boundary into separate Monday buckets', () => {
      const buckets = aggregateProgressByRange(
        [session('2025-12-29', 60, 400), session('2026-01-02', 62, 420)],
        'week',
        'maxWeight'
      );

      expect(buckets.map((b) => b.key)).toEqual(['2025-12-29']);
      expect(buckets[0].label).toBe('Wk 29 Dec');
      expect(buckets[0].yearLabel).toBe("'25");
      expect(buckets[0].sessionCount).toBe(2);
    });
  });

  describe('MONTH aggregation', () => {
    it('groups sessions into calendar months and plots the monthly peak', () => {
      const buckets = aggregateProgressByRange(
        [
          session('2026-07-31', 70, 500),
          session('2026-08-01', 72, 520),
          session('2026-08-20', 80, 660),
          session('2026-09-01', 78, 600),
          session('2026-09-15', 85, 700),
        ],
        'month',
        'maxWeight'
      );

      expect(buckets.map((b) => b.key)).toEqual(['2026-07', '2026-08', '2026-09']);
      expect(buckets.map((b) => b.label)).toEqual(['Jul', 'Aug', 'Sep']);
      expect(buckets.map((b) => b.yearLabel)).toEqual(["'26", "'26", "'26"]);
      expect(buckets.map((b) => b.value)).toEqual([70, 80, 85]);
      expect(buckets.map((b) => b.sessionCount)).toEqual([1, 2, 2]);
    });

    it('reports the best volume month when volume is selected', () => {
      const buckets = aggregateProgressByRange(
        [session('2026-08-10', 80, 2400), session('2026-08-24', 85, 1800)],
        'month',
        'totalVolume'
      );

      expect(buckets).toHaveLength(1);
      expect(buckets[0].value).toBe(2400);
    });

    it('distinguishes the same month in different years', () => {
      const buckets = aggregateProgressByRange(
        [session('2025-09-10', 70, 500), session('2026-09-10', 90, 800)],
        'month',
        'maxWeight'
      );

      expect(buckets.map((b) => b.key)).toEqual(['2025-09', '2026-09']);
      expect(buckets.map((b) => b.yearLabel)).toEqual(["'25", "'26"]);
    });
  });

  describe('robustness', () => {
    it('returns an empty dataset when there are no sessions', () => {
      expect(aggregateProgressByRange([], 'session', 'maxWeight')).toEqual([]);
      expect(aggregateProgressByRange([], 'week', 'maxWeight')).toEqual([]);
      expect(aggregateProgressByRange([], 'month', 'maxWeight')).toEqual([]);
    });

    it('skips rows with unusable dates instead of plotting them', () => {
      const buckets = aggregateProgressByRange(
        [
          // @ts-expect-error - testing malformed runtime input
          session(undefined, 50, 300),
          session('not-a-date', 55, 320),
          session('2026-09-02', 60, 380),
        ],
        'session',
        'maxWeight'
      );

      expect(buckets).toHaveLength(1);
      expect(buckets[0].key).toBe('2026-09-02');
    });

    it('accepts full ISO timestamps alongside plain calendar dates', () => {
      const buckets = aggregateProgressByRange(
        [session('2026-09-02T08:30:00Z', 60, 380), session('2026-09-01', 55, 350)],
        'session',
        'maxWeight'
      );

      expect(buckets.map((b) => b.key)).toEqual(['2026-09-01', '2026-09-02']);
    });
  });

  describe('computeChartMaxValue', () => {
    it('adds 30% headroom above the tallest plotted value', () => {
      expect(computeChartMaxValue([80, 90, 85])).toBe(Math.ceil(90 * 1.3));
    });

    it('never drops below a chart-friendly floor of 10', () => {
      expect(computeChartMaxValue([2, 4])).toBe(13); // ceil(10 * 1.3)
      expect(computeChartMaxValue([])).toBe(13);
    });

    it('rounds the axis bound up to a whole number', () => {
      expect(computeChartMaxValue([87.5])).toBe(Math.ceil(87.5 * 1.3));
      expect(Number.isInteger(computeChartMaxValue([87.5]))).toBe(true);
    });
  });
});
