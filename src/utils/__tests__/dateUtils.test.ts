import {
  calculateWorkoutStreak,
  calculateWeeklyCompliance,
  formatISODate,
  formatRelativeDate,
  formatDate,
  formatDayHeader,
  getWeekDates,
  getTodayDateString,
  getTodayDayOfWeek,
  DAYS_OF_WEEK,
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

