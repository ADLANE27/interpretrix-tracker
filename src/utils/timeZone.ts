
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { addMinutes, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const TIMEZONE = 'Europe/Paris';

// Convert a UTC date string to a zoned Date object in French timezone
export const toFrenchTime = (date: string | Date) => {
  return toZonedTime(new Date(date), TIMEZONE);
};

// Format a date in French timezone
export const formatFrenchTime = (date: Date | string, formatString: string) => {
  return formatInTimeZone(new Date(date), TIMEZONE, formatString, { locale: fr });
};

// Convert local time to UTC for storage
export const toUTCString = (date: Date) => {
  return date.toISOString();
};

// Add minutes to a date while preserving timezone
export const addMinutesInTimezone = (date: Date, minutes: number) => {
  return addMinutes(date, minutes);
};

// Check if two time ranges overlap, considering timezone
export const hasTimeOverlap = (
  startTime1: string,
  endTime1: string,
  startTime2: string,
  endTime2: string
): boolean => {
  const start1 = toFrenchTime(startTime1);
  const end1 = toFrenchTime(endTime1);
  const start2 = toFrenchTime(startTime2);
  const end2 = toFrenchTime(endTime2);

  return start1 < end2 && end1 > start2;
};
