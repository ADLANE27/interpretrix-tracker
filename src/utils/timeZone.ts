import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Format a date in French timezone
export const formatFrenchTime = (date: Date | string, formatString: string) => {
  const dateObj = new Date(date);
  // Convert UTC to local time (which is what was stored) and subtract one hour
  const localDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60 * 1000) - (60 * 60 * 1000));
  return format(localDate, formatString, { locale: fr });
};

// Convert date to match stored local time
export const toFrenchTime = (date: string | Date) => {
  const dateObj = new Date(date);
  // Convert UTC to local time (which is what was stored) and subtract one hour
  return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60 * 1000) - (60 * 60 * 1000));
};

// Keep these functions as they are
export const toUTCString = (date: Date) => {
  return date.toISOString();
};

export const addMinutesInTimezone = (date: Date, minutes: number) => {
  const newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + minutes);
  return newDate;
};

export const hasTimeOverlap = (
  startTime1: string,
  endTime1: string,
  startTime2: string,
  endTime2: string
): boolean => {
  const start1 = new Date(startTime1);
  const end1 = new Date(endTime1);
  const start2 = new Date(startTime2);
  const end2 = new Date(endTime2);

  return start1 < end2 && end1 > start2;
};
