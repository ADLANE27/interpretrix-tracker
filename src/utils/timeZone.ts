
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Format a date in French format without timezone conversion
export const formatFrenchTime = (date: Date | string, formatString: string) => {
  // Ensure we don't do any timezone conversion, just format the date
  const dateObj = new Date(date);
  return format(dateObj, formatString, { locale: fr });
};

// Simply return the date object without any conversion
export const toFrenchTime = (date: string | Date) => {
  return new Date(date);
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
