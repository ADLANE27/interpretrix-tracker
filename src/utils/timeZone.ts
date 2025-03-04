import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Format a date exactly as it is, no conversions
export const formatFrenchTime = (date: Date | string, formatString: string) => {
  try {
    const dateObj = new Date(date);
    return format(dateObj, formatString, { locale: fr });
  } catch (error) {
    console.error('Error in formatFrenchTime:', error);
    return '';
  }
};

// Just create a Date object, no conversions
export const toFrenchTime = (date: string | Date) => {
  try {
    return new Date(date);
  } catch (error) {
    console.error('Error in toFrenchTime:', error);
    return new Date();
  }
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
  const start1 = toFrenchTime(startTime1);
  const end1 = toFrenchTime(endTime1);
  const start2 = toFrenchTime(startTime2);
  const end2 = toFrenchTime(endTime2);

  return start1 < end2 && end1 > start2;
};
