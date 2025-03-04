import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Format a date without timezone conversion
export const formatFrenchTime = (date: Date | string, formatString: string) => {
  return format(new Date(date), formatString, { locale: fr });
};

// Keep these functions for backward compatibility but make them not do any timezone conversion
export const toFrenchTime = (date: string | Date) => {
  return new Date(date);
};

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
