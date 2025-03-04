import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Format a date with proper timezone handling for legacy data
export const formatFrenchTime = (date: Date | string, formatString: string) => {
  // Handle legacy data by adding back the hour that was subtracted
  const dateObj = new Date(date);
  const adjustedDate = new Date(dateObj.getTime() + (1 * 60 * 60 * 1000)); // Add 1 hour for legacy data
  return format(adjustedDate, formatString, { locale: fr });
};

// Convert date to French timezone for legacy data
export const toFrenchTime = (date: string | Date) => {
  const dateObj = new Date(date);
  return new Date(dateObj.getTime() + (1 * 60 * 60 * 1000)); // Add 1 hour for legacy data
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
