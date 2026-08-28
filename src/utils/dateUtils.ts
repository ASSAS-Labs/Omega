import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';
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
  const start = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday start
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
