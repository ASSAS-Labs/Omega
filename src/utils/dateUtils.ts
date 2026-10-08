import { format, parseISO, startOfWeek, addDays, subDays } from 'date-fns';
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
  return formatISODate(new Date());
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

/** Column headings of the month grid, Monday first (ISO 8601 week order). */
export const WEEKDAY_INITIALS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

/** Month + year heading of the month grid, e.g. "October 2026". */
export function formatMonthYear(baseDate: Date = new Date()): string {
  return format(baseDate, 'MMMM yyyy');
}

/**
 * Lays out a calendar month as 4-6 Monday-first weekly rows.
 *
 * Every row holds exactly 7 slots; slots that fall outside the month are
 * `null`, so a cell's column always matches its weekday and the caller can
 * render the grid without doing any date arithmetic of its own. The number of
 * rows is whatever the month needs to be fully covered (4 for a 28-day month
 * starting on a Monday, 5 otherwise for months of 30/31 days, 6 when a 31-day
 * month starts on Saturday or Sunday).
 *
 * @param baseDate - Any date inside the month to lay out
 */
export function getMonthCalendarGrid(baseDate: Date = new Date()): (Date | null)[][] {
  const firstOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
  // Monday = 0 ... Sunday = 6
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const rowCount = Math.ceil((leadingBlanks + daysInMonth) / 7);

  return Array.from({ length: rowCount }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const dayOfMonth = week * 7 + weekday - leadingBlanks + 1;
      if (dayOfMonth < 1 || dayOfMonth > daysInMonth) return null;
      return new Date(baseDate.getFullYear(), baseDate.getMonth(), dayOfMonth);
    })
  );
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
 * True when the split schedules a session on that day.
 *
 * A split that schedules *nothing* — every day empty or no split configured at
 * all — means "every calendar day is expected": without that fallback a user who
 * never set up a routine could never break a streak, and the count would grow
 * into "total days ever trained" instead.
 */
function isScheduledDay(day: Date, scheduledDays?: DayOfWeek[] | null): boolean {
  if (!scheduledDays || scheduledDays.length === 0) return true;
  return scheduledDays.includes(DAYS_OF_WEEK[(day.getDay() + 6) % 7]);
}

/** Unique, valid `YYYY-MM-DD` workout days, ascending (earliest first). */
function toUniqueWorkoutDays(workoutDates: (string | Date)[] | null | undefined): string[] {
  if (!workoutDates || !Array.isArray(workoutDates)) return [];
  return Array.from(
    new Set(
      workoutDates
        .filter((d) => Boolean(d))
        .map((d) => formatISODate(d))
        .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
    )
  ).sort();
}

/**
 * The one rule both streak figures in the app are measured with (`getComplianceStats`
 * delegates here, so the Dashboard badge, Analytics and the streak sheet can
 * never disagree): the length of the run that is still alive on `referenceDate`.
 *
 * Rules:
 * - Dates are normalized to calendar YYYY-MM-DD days, so multiple sessions on
 *   one day count as a single active day.
 * - The run walks back day by day from `referenceDate` (today). A day the split
 *   does not schedule — a rest day — neither adds to the run nor ends it, which
 *   is what keeps a Mon/Tue/Thu/Fri routine's streak alive across the Wednesday
 *   off. Days trained *outside* the split still count towards it.
 * - A scheduled day that passed without a session ends the run. The reference
 *   day itself is exempt: an untrained today is not a miss yet.
 * - With no split scheduling anything, every day counts as expected, so the rule
 *   degrades to "consecutive calendar days".
 *
 * @param scheduledDays - Weekdays the split trains; omit/empty to expect daily.
 */
export function calculateWorkoutStreak(
  workoutDates: (string | Date)[],
  referenceDate?: string | Date,
  scheduledDays?: DayOfWeek[] | null
): number {
  const trainedDays = new Set(toUniqueWorkoutDays(workoutDates));
  if (trainedDays.size === 0) return 0;

  const refKey = formatISODate(referenceDate ?? new Date());
  const earliest = parseISO(Array.from(trainedDays).sort()[0]);

  let streak = 0;
  let cursor = parseISO(refKey);
  while (cursor >= earliest) {
    const dayKey = formatISODate(cursor);
    if (trainedDays.has(dayKey)) {
      streak++;
    } else if (dayKey < refKey && isScheduledDay(cursor, scheduledDays)) {
      break;
    }
    cursor = subDays(cursor, 1);
  }

  return streak;
}

/**
 * Computes every streak in the history, measured with the same rule as
 * `calculateWorkoutStreak` — so the run that is still alive comes back at its
 * current length and can be compared with the all-time bests.
 *
 * Rules:
 * - Dates are normalized to calendar YYYY-MM-DD days and deduplicated, so
 *   multiple sessions logged on the same day count as a single active day.
 * - Days trained extend the run; a rest day is skipped.
 * - A scheduled day that passed without a session concludes the run.
 * - Days from tomorrow onward never conclude a run, so the trailing run is the
 *   live streak rather than something an open day ended.
 *
 * The split used is the caller's *current* one — it is applied to the whole
 * history, which is the best available approximation now that past routines are
 * not stored.
 *
 * @param workoutDates - ISO date (or datetime) strings of logged workouts
 * @returns Every streak length, sorted descending (highest first).
 *          An empty array when no valid workout day exists.
 */
export function calculateAllStreaks(
  workoutDates: string[],
  scheduledDays?: DayOfWeek[] | null
): number[] {
  const days = toUniqueWorkoutDays(workoutDates);
  if (days.length === 0) return [];

  const trainedDays = new Set(days);
  const todayKey = formatISODate(new Date());
  const lastKey = days[days.length - 1];
  // A logged day can sit in the future (bad clock, restored backup); it must
  // still be walked, so the span ends at whichever comes last.
  const end = parseISO(lastKey > todayKey ? lastKey : todayKey);

  const streaks: number[] = [];
  let current = 0;
  let cursor = parseISO(days[0]);
  while (cursor <= end) {
    const dayKey = formatISODate(cursor);
    if (trainedDays.has(dayKey)) {
      current++;
    } else if (dayKey < todayKey && isScheduledDay(cursor, scheduledDays)) {
      if (current > 0) streaks.push(current);
      current = 0;
    }
    cursor = addDays(cursor, 1);
  }
  if (current > 0) streaks.push(current);

  return streaks.sort((a, b) => b - a);
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

