import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import { DayOfWeek } from '../types';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getTodayDayOfWeek(): DayOfWeek {
  const dayIndex = new Date().getDay();
  const days: DayOfWeek[] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[dayIndex];
}

export function formatDate(dateString: string): string {
  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

export function formatDayHeader(dateString: string): string {
  try {
    return format(parseISO(dateString), 'EEEE, MMMM d');
  } catch {
    return dateString;
  }
}

export function getWeekDates(baseDate: Date = new Date()): Date[] {
  const start = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday start (ISO 8601)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Formats a Date object or ISO string to a standard YYYY-MM-DD string.
 */
export function formatISODate(date: Date | string): string {
  if (!date) return '';
  if (typeof date === 'string') {
    return date.includes('T') ? date.split('T')[0] : date;
  }
  return format(date, 'yyyy-MM-dd');
}

/**
 * Formats a date string or Date object into a human-friendly relative label:
 * - "Today" if the date matches the reference date (defaults to current date)
 * - "Yesterday" if 1 day prior
 * - "X days ago" if 2-30 days prior
 * - Formatted date string (e.g. "MMM d, yyyy") if older
 */
export function formatRelativeDate(
  date: string | Date,
  referenceDate?: string | Date
): string {
  try {
    const targetStr = formatISODate(date);
    const refStr = referenceDate ? formatISODate(referenceDate) : formatISODate(new Date());

    if (!targetStr || !refStr) return '';
    if (targetStr === refStr) return 'Today';

    const targetDay = parseISO(targetStr);
    const refDay = parseISO(refStr);
    const diffDays = Math.round((refDay.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 30) return `${diffDays} days ago`;

    return format(targetDay, 'MMM d, yyyy');
  } catch {
    return typeof date === 'string' ? date : formatISODate(date);
  }
}

/**
 * Calculates the current consecutive workout streak.
 *
 * Rules:
 * - Dates are normalized to calendar YYYY-MM-DD days.
 * - Multiple workouts on the same day count as 1 active day.
 * - If the latest workout is today or yesterday (relative to referenceDate), the streak is alive.
 * - If the gap from the reference date to the latest workout is >= 2 days, the streak is reset to 0.
 * - Consecutive workout days increment the streak.
 * - Any gap of >= 2 days between workout sessions terminates the streak.
 */
export function calculateWorkoutStreak(
  workoutDates: (string | Date)[],
  referenceDate?: string | Date
): number {
  if (!workoutDates || !Array.isArray(workoutDates) || workoutDates.length === 0) {
    return 0;
  }

  const refStr = referenceDate ? formatISODate(referenceDate) : formatISODate(new Date());
  const refDay = parseISO(refStr);

  // Normalize, filter valid dates, and deduplicate to unique YYYY-MM-DD strings
  const uniqueDates = Array.from(
    new Set(
      workoutDates
        .filter((d) => Boolean(d))
        .map((d) => formatISODate(d))
        .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
    )
  ).sort().reverse(); // Descending order: latest first

  if (uniqueDates.length === 0) {
    return 0;
  }

  const mostRecent = parseISO(uniqueDates[0]);
  const daysDiffFromRef = Math.round((refDay.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));

  // If the most recent workout is older than yesterday (gap >= 2 days), streak is broken (0).
  // Note: if mostRecent is in the future or today (diff <= 0) or yesterday (diff == 1), streak is active.
  if (daysDiffFromRef >= 2) {
    return 0;
  }

  let streak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = parseISO(uniqueDates[i]);
    const prev = parseISO(uniqueDates[i + 1]);
    const diffDays = Math.round((current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else if (diffDays > 1) {
      break;
    }
  }

  return streak;
}

export interface WeeklyCompliance {
  scheduledCount: number;
  completedCount: number;
  complianceRate: number; // 0 to 100 percentage
  isTargetMet: boolean;
}

/**
 * Calculates completed target workouts vs. scheduled split days for a given week.
 * Works seamlessly across ISO week boundaries, month and year transitions.
 *
 * @param scheduledDays - Array of scheduled DayOfWeek (e.g. ['Monday', 'Wednesday', 'Friday'])
 * @param completedDates - Array of completed workout dates (ISO strings or Date objects)
 * @param baseDate - Reference date to determine the ISO week (Monday-Sunday)
 */
export function calculateWeeklyCompliance(
  scheduledDays: DayOfWeek[],
  completedDates: (string | Date)[],
  baseDate: Date = new Date()
): WeeklyCompliance {
  const scheduledCount = Array.isArray(scheduledDays) ? scheduledDays.length : 0;
  if (scheduledCount === 0) {
    return {
      scheduledCount: 0,
      completedCount: 0,
      complianceRate: 100,
      isTargetMet: true,
    };
  }

  const weekDates = getWeekDates(baseDate);
  const weekDateSet = new Set(weekDates.map((d) => formatISODate(d)));

  // Deduplicate completed unique dates falling within the ISO week
  const completedInWeek = new Set(
    (completedDates || [])
      .filter((d) => Boolean(d))
      .map((d) => formatISODate(d))
      .filter((dateStr) => weekDateSet.has(dateStr))
  );

  const completedCount = completedInWeek.size;
  const complianceRate = Math.min(100, Math.round((completedCount / scheduledCount) * 100));
  const isTargetMet = completedCount >= scheduledCount;

  return {
    scheduledCount,
    completedCount,
    complianceRate,
    isTargetMet,
  };
}

