import {
  calculateAllStreaks,
  calculateWorkoutStreak,
  calculateWeeklyCompliance,
  formatISODate,
  formatMonthYear,
  formatRelativeDate,
  formatDate,
  formatDayHeader,
  getMonthCalendarGrid,
  getWeekDates,
  getTodayDateString,
  getTodayDayOfWeek,
  DAYS_OF_WEEK,
  WEEKDAY_INITIALS,
} from '../dateUtils';

describe('Date Utilities', () => {
  describe('Consecutive Workout Streak Calculation (calculateWorkoutStreak)', () => {
    const referenceDate = '2026-09-01'; // Reference Tuesday

    it('should return a streak of 3 for 3 consecutive workout dates', () => {
      const dates = ['2026-09-01', '2026-08-31', '2026-08-30'];
      expect(calculateWorkoutStreak(dates, referenceDate)).toBe(3);
    });

    it('should calculate streak when workouts are provided out of order', () => {
      const dates = ['2026-08-30', '2026-09-01', '2026-08-31'];
      expect(calculateWorkoutStreak(dates, referenceDate)).toBe(3);
    });

    it('should maintain the streak when the most recent workout was yesterday', () => {
      // Reference is Sep 1, latest workout is Aug 31
      const dates = ['2026-08-31', '2026-08-30', '2026-08-29', '2026-08-28'];
      expect(calculateWorkoutStreak(dates, referenceDate)).toBe(4);
    });

    it('should reset current streak to 0 if the latest workout was >= 2 days ago (gap from today)', () => {
      // Latest workout is Aug 29, gap to Sep 1 is 3 days
      const dates = ['2026-08-29', '2026-08-28', '2026-08-27'];
      expect(calculateWorkoutStreak(dates, referenceDate)).toBe(0);
    });

    it('should terminate streak counting at the first internal gap >= 2 days', () => {
      // Sep 1, Aug 31, Aug 30 (gap) Aug 27, Aug 26
      const dates = ['2026-09-01', '2026-08-31', '2026-08-30', '2026-08-27', '2026-08-26'];
      expect(calculateWorkoutStreak(dates, referenceDate)).toBe(3);
    });

    it('should count multiple workout sessions on the same calendar day as 1 active streak day', () => {
      const dates = [
        '2026-09-01T08:00:00Z',
        '2026-09-01T17:30:00Z',
        '2026-08-31T09:15:00Z',
        '2026-08-31T19:00:00Z',
        '2026-08-30T10:00:00Z',
      ];
      expect(calculateWorkoutStreak(dates, referenceDate)).toBe(3);
    });

    it('should support Date objects alongside string timestamps', () => {
      const dates = [
        new Date('2026-09-01T12:00:00Z'),
        new Date('2026-08-31T12:00:00Z'),
      ];
      expect(calculateWorkoutStreak(dates, referenceDate)).toBe(2);
    });

    it('should return 0 when workout dates array is empty, null, or contains only invalid dates', () => {
      expect(calculateWorkoutStreak([], referenceDate)).toBe(0);
      expect(calculateWorkoutStreak(['invalid-date-string'], referenceDate)).toBe(0);
      // @ts-expect-error - testing invalid runtime input
      expect(calculateWorkoutStreak(null, referenceDate)).toBe(0);
      // @ts-expect-error - testing invalid runtime input
      expect(calculateWorkoutStreak(undefined, referenceDate)).toBe(0);
    });

  });

  describe('All-Time Streak History (calculateAllStreaks)', () => {
    it('returns a single streak for one unbroken run of consecutive days', () => {
      const dates = ['2026-08-30', '2026-08-31', '2026-09-01'];
      expect(calculateAllStreaks(dates)).toEqual([3]);
    });

    it('returns every streak sorted highest first when gaps reset the run', () => {
      // 5 consecutive days, then a 3-day run, then 2 solo sessions
      const dates = [
        '2026-08-01',
        '2026-08-02',
        '2026-08-03',
        '2026-08-04',
        '2026-08-05',
        // gap of 3 days
        '2026-08-09',
        '2026-08-10',
        '2026-08-11',
        // gap of 1 day (single-day streak)
        '2026-08-13',
        // gap of 4 days
        '2026-08-18',
      ];

      expect(calculateAllStreaks(dates)).toEqual([5, 3, 1, 1]);
    });

    it('treats a 2-day gap as the start of a new streak', () => {
      // Aug 1, 2 (streak 2) ... Aug 4 (new streak) ... Aug 7 (new streak)
      expect(calculateAllStreaks(['2026-08-01', '2026-08-02', '2026-08-04', '2026-08-07'])).toEqual([
        2, 1, 1,
      ]);
    });

    it('counts multiple sessions on the same day as a single streak day', () => {
      const dates = [
        '2026-09-01T08:00:00Z',
        '2026-09-01T17:30:00Z',
        '2026-09-02T09:15:00Z',
        '2026-09-02T19:00:00Z',
        '2026-09-02T21:00:00Z',
        '2026-09-03T10:00:00Z',
      ];

      expect(calculateAllStreaks(dates)).toEqual([3]);
    });

    it('sorts input chronologically regardless of the order it is provided in', () => {
      const shuffled = ['2026-08-12', '2026-08-10', '2026-08-11', '2026-08-02', '2026-08-01'];
      expect(calculateAllStreaks(shuffled)).toEqual([3, 2]);
    });

    it('returns an empty array when there is no valid workout day', () => {
      expect(calculateAllStreaks([])).toEqual([]);
      expect(calculateAllStreaks(['invalid-date-string'])).toEqual([]);
      // @ts-expect-error - testing invalid runtime input
      expect(calculateAllStreaks(null)).toEqual([]);
      // @ts-expect-error - testing invalid runtime input
      expect(calculateAllStreaks(undefined)).toEqual([]);
    });

    it('ignores unusable entries mixed in with real workout days', () => {
      const dates = ['', '2026-09-01', 'nonsense', '2026-09-02'];
      expect(calculateAllStreaks(dates)).toEqual([2]);
    });
  });

  describe('Split-Aware Streaks (scheduled-day model)', () => {
    // Mon/Tue/Thu/Fri/Sat routine: Wednesday and Sunday are training rest days.
    const split: ('Monday' | 'Tuesday' | 'Thursday' | 'Friday' | 'Saturday')[] = [
      'Monday',
      'Tuesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    // Thursday 2026-10-08 — the Dashboard state the reference screenshot shows.
    const thursday = '2026-10-08';

    it('keeps a run alive across a rest day instead of resetting it', () => {
      // Mon 5th + Tue 6th trained, Wednesday off, Thursday not trained yet
      expect(calculateWorkoutStreak(['2026-10-05', '2026-10-06'], thursday, split)).toBe(2);
    });

    it('ends the run at the first scheduled day that passed untrained', () => {
      // Thu 1st + Fri 2nd trained, Sat 3rd (scheduled) missed, then Mon 5th + Tue 6th
      expect(
        calculateWorkoutStreak(
          ['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06'],
          thursday,
          split
        )
      ).toBe(2);
    });

    it('resets the run once a scheduled day passes untrained, even if nothing else changed', () => {
      // Same two sessions, read one day later: Thursday went untrained
      expect(calculateWorkoutStreak(['2026-10-05', '2026-10-06'], '2026-10-09', split)).toBe(0);
    });

    it('counts a session logged on a rest day', () => {
      // Wednesday 7th is a rest day, but training on it still counts
      expect(calculateWorkoutStreak(['2026-10-07'], thursday, split)).toBe(1);
    });

    it('expects every day when no split schedules anything', () => {
      // The fallback keeps the old calendar-day rule: yesterday's session is a
      // 1-day run, and a session two days back is already stale.
      expect(calculateWorkoutStreak(['2026-10-07'], '2026-10-08', [])).toBe(1);
      expect(calculateWorkoutStreak(['2026-10-06'], '2026-10-08', [])).toBe(0);
      expect(calculateWorkoutStreak(['2026-10-06'], '2026-10-08')).toBe(0);
    });

    it('joins sessions separated only by rest days into one all-time run', () => {
      // Mon/Tue/Thu/Fri routine: Sat 3rd + Sun 4th are both off days, so
      // Fri 2nd, Mon 5th and Tue 6th are one unbroken run of 3.
      const noSaturday: ('Monday' | 'Tuesday' | 'Thursday' | 'Friday')[] = [
        'Monday',
        'Tuesday',
        'Thursday',
        'Friday',
      ];
      const dates = ['2026-10-02', '2026-10-05', '2026-10-06'];

      expect(calculateAllStreaks(dates, noSaturday)).toEqual([3]);
      // Without a split the same dates are two runs
      expect(calculateAllStreaks(dates)).toEqual([2, 1]);
      // The Mon/Tue/Thu/Fri/Sat routine trains on Saturday, so the 3rd is a miss
      expect(calculateAllStreaks(dates, split)).toEqual([2, 1]);
    });

    it('reports the live run at the length the current-streak rule gives it', () => {
      const dates = ['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06'];
      const live = calculateWorkoutStreak(dates, thursday, split);

      expect(live).toBe(2);
      expect(calculateAllStreaks(dates, split)).toContain(live);
    });
  });

  describe('Weekly Target Compliance (calculateWeeklyCompliance)', () => {
    // Current ISO week for 2026-09-01 (Tuesday): Mon Aug 31 - Sun Sep 6
    const baseDate = new Date('2026-09-01T12:00:00Z');
    const scheduledSplit: ('Monday' | 'Wednesday' | 'Friday' | 'Saturday')[] = [
      'Monday',
      'Wednesday',
      'Friday',
      'Saturday',
    ];

    it('should calculate completed workouts vs scheduled split for the current week', () => {
      const completed = [
        '2026-08-31', // Monday (in week)
        '2026-09-02', // Wednesday (in week)
      ];

      const compliance = calculateWeeklyCompliance(scheduledSplit, completed, baseDate);
      expect(compliance.scheduledCount).toBe(4);
      expect(compliance.completedCount).toBe(2);
      expect(compliance.complianceRate).toBe(50);
      expect(compliance.isTargetMet).toBe(false);
    });

    it('should mark isTargetMet as true when target count is achieved or exceeded', () => {
      const completed = [
        '2026-08-31', // Monday
        '2026-09-01', // Tuesday
        '2026-09-02', // Wednesday
        '2026-09-04', // Friday
      ];

      const compliance = calculateWeeklyCompliance(scheduledSplit, completed, baseDate);
      expect(compliance.scheduledCount).toBe(4);
      expect(compliance.completedCount).toBe(4);
      expect(compliance.complianceRate).toBe(100);
      expect(compliance.isTargetMet).toBe(true);
    });

    it('should count same-day multiple workouts as 1 completed compliance day', () => {
      const completed = [
        '2026-08-31T08:00:00Z',
        '2026-08-31T18:00:00Z',
      ];

      const compliance = calculateWeeklyCompliance(scheduledSplit, completed, baseDate);
      expect(compliance.completedCount).toBe(1);
    });

    it('should ignore workouts outside the current ISO week window', () => {
      const completed = [
        '2026-08-25', // Prior week
        '2026-08-31', // In current week
        '2026-09-07', // Next week
      ];

      const compliance = calculateWeeklyCompliance(scheduledSplit, completed, baseDate);
      expect(compliance.completedCount).toBe(1);
    });

    it('should accurately handle ISO week boundaries across month transitions', () => {
      // Week of Mon Aug 31, 2026 to Sun Sep 06, 2026 (spans August and September)
      const weekDates = getWeekDates(baseDate);
      expect(formatISODate(weekDates[0])).toBe('2026-08-31'); // Monday
      expect(formatISODate(weekDates[6])).toBe('2026-09-06'); // Sunday

      const compliance = calculateWeeklyCompliance(
        ['Monday', 'Tuesday'],
        ['2026-08-31', '2026-09-01'],
        baseDate
      );
      expect(compliance.completedCount).toBe(2);
      expect(compliance.isTargetMet).toBe(true);
    });

    it('should accurately handle ISO week boundaries across year transitions', () => {
      // Week of Dec 29, 2025 (Monday) to Jan 4, 2026 (Sunday)
      const yearTransitionDate = new Date('2026-01-01T12:00:00Z');
      const weekDates = getWeekDates(yearTransitionDate);

      expect(formatISODate(weekDates[0])).toBe('2025-12-29'); // Mon in 2025
      expect(formatISODate(weekDates[6])).toBe('2026-01-04'); // Sun in 2026

      const compliance = calculateWeeklyCompliance(
        ['Monday', 'Thursday'],
        ['2025-12-29', '2026-01-01'],
        yearTransitionDate
      );
      expect(compliance.scheduledCount).toBe(2);
      expect(compliance.completedCount).toBe(2);
      expect(compliance.isTargetMet).toBe(true);
    });

    it('should handle empty scheduled days gracefully', () => {
      const compliance = calculateWeeklyCompliance([], ['2026-09-01'], baseDate);
      expect(compliance.scheduledCount).toBe(0);
      expect(compliance.completedCount).toBe(0);
      expect(compliance.isTargetMet).toBe(true);
    });
  });

  describe('Month Calendar Grid (getMonthCalendarGrid)', () => {
    /** Grid rendered as ISO strings, so expectations stay readable. */
    const isoGrid = (grid: (Date | null)[][]): (string | null)[][] =>
      grid.map((week) => week.map((day) => (day ? formatISODate(day) : null)));

    it('lays a 31-day month out in five Monday-first rows with the leading blanks kept', () => {
      // October 2026 starts on a Thursday: 3 blanks, then the 1st
      const grid = getMonthCalendarGrid(new Date('2026-10-18T12:00:00Z'));

      expect(grid).toHaveLength(5);
      expect(isoGrid(grid)[0]).toEqual([
        null,
        null,
        null,
        '2026-10-01',
        '2026-10-02',
        '2026-10-03',
        '2026-10-04',
      ]);
      expect(isoGrid(grid)[4]).toEqual([
        '2026-10-26',
        '2026-10-27',
        '2026-10-28',
        '2026-10-29',
        '2026-10-30',
        '2026-10-31',
        null,
      ]);
    });

    it('uses exactly four rows for a 28-day month that starts on a Monday', () => {
      // February 2027 starts on a Monday and has 28 days
      const grid = getMonthCalendarGrid(new Date('2027-02-14T12:00:00Z'));

      expect(grid).toHaveLength(4);
      expect(grid.flat().filter((day) => day === null)).toHaveLength(0);
      expect(isoGrid(grid)[0][0]).toBe('2027-02-01');
      expect(isoGrid(grid)[3][6]).toBe('2027-02-28');
    });

    it('every filled cell sits in the column of its own weekday', () => {
      // One month per starting weekday, plus both year edges
      const months = [
        '2026-01-15T12:00:00Z',
        '2026-03-15T12:00:00Z',
        '2026-05-15T12:00:00Z',
        '2026-08-15T12:00:00Z',
        '2026-10-15T12:00:00Z',
        '2026-11-15T12:00:00Z',
        '2027-02-15T12:00:00Z',
        '2027-05-15T12:00:00Z',
      ];

      for (const month of months) {
        const grid = getMonthCalendarGrid(new Date(month));

        grid.forEach((week) => {
          week.forEach((day, weekdayIndex) => {
            if (!day) return;
            expect((day.getDay() + 6) % 7).toBe(weekdayIndex); // Monday = 0
          });
        });
      }
    });

    it('covers every day of the month exactly once and never spills into its neighbours', () => {
      const baseDate = new Date('2026-10-18T12:00:00Z');
      const days = getMonthCalendarGrid(baseDate).flat().filter((day): day is Date => day !== null);
      const isoDates = days.map((day) => formatISODate(day));

      expect(days).toHaveLength(31);
      expect(new Set(isoDates).size).toBe(31);
      expect(isoDates).toEqual(
        Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)
      );
    });

    it('formats the month heading as month + year', () => {
      expect(formatMonthYear(new Date('2026-10-18T12:00:00Z'))).toBe('October 2026');
      expect(formatMonthYear(new Date('2027-01-05T12:00:00Z'))).toBe('January 2027');
    });

    it('exposes Monday-first weekday column initials', () => {
      expect(WEEKDAY_INITIALS).toEqual(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);
    });
  });

  describe('Formatted Date Outputs & Relative Time Stamps', () => {
    const referenceDate = '2026-09-01'; // Tuesday

    it('should format Date objects and ISO strings to standard YYYY-MM-DD', () => {
      expect(formatISODate('2026-09-01T14:30:00Z')).toBe('2026-09-01');
      expect(formatISODate('2026-09-01')).toBe('2026-09-01');
      expect(formatISODate(new Date('2026-09-01T14:30:00Z'))).toBe('2026-09-01');
    });

    it('should format relative dates: "Today"', () => {
      expect(formatRelativeDate('2026-09-01', referenceDate)).toBe('Today');
      expect(formatRelativeDate('2026-09-01T10:00:00', referenceDate)).toBe('Today');
    });

    it('should format relative dates: "Yesterday"', () => {
      expect(formatRelativeDate('2026-08-31', referenceDate)).toBe('Yesterday');
      expect(formatRelativeDate('2026-08-31T23:59:59', referenceDate)).toBe('Yesterday');
    });

    it('should format relative dates: "X days ago"', () => {
      expect(formatRelativeDate('2026-08-30', referenceDate)).toBe('2 days ago');
      expect(formatRelativeDate('2026-08-27', referenceDate)).toBe('5 days ago');
      expect(formatRelativeDate('2026-08-15', referenceDate)).toBe('17 days ago');
    });

    it('should format relative dates older than 30 days as formatted calendar date', () => {
      expect(formatRelativeDate('2026-06-15', referenceDate)).toBe('Jun 15, 2026');
    });

    it('should handle invalid date strings gracefully in formatRelativeDate and formatISODate', () => {
      expect(formatISODate('')).toBe('');
      // @ts-expect-error - testing invalid runtime input
      expect(formatISODate(null)).toBe('');
      expect(formatRelativeDate('')).toBe('');
      expect(formatRelativeDate('invalid-date', referenceDate)).toBe('invalid-date');
    });

    it('should format dates with formatDate helper and handle invalid dates gracefully', () => {
      expect(formatDate('2026-09-01')).toBe('Sep 1, 2026');
      expect(formatDate('2026-12-25')).toBe('Dec 25, 2026');
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });

    it('should format header with formatDayHeader helper and handle invalid dates gracefully', () => {
      expect(formatDayHeader('2026-09-01')).toBe('Tuesday, September 1');
      expect(formatDayHeader('invalid-date')).toBe('invalid-date');
    });

    it('should return valid day of week strings from DAYS_OF_WEEK', () => {
      expect(DAYS_OF_WEEK).toEqual([
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ]);
    });

    it('should return valid today date string and day of week', () => {
      expect(/^\d{4}-\d{2}-\d{2}$/.test(getTodayDateString())).toBe(true);
      expect(DAYS_OF_WEEK.includes(getTodayDayOfWeek())).toBe(true);
    });
  });
});

