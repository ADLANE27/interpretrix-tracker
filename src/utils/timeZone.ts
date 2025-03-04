
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Format the date string using the raw timestamp
export const formatFrenchTime = (date: Date | string, formatString: string) => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    console.log('formatFrenchTime input:', date);
    console.log('formatFrenchTime output:', format(dateObj, formatString, { locale: fr }));
    return format(dateObj, formatString, { locale: fr });
  } catch (error) {
    console.error('Error in formatFrenchTime:', error);
    return '';
  }
};

// Use the raw timestamp without any timezone adjustments
export const toFrenchTime = (date: string | Date) => {
  try {
    console.log('toFrenchTime input:', date);
    const result = typeof date === 'string' ? new Date(date) : date;
    console.log('toFrenchTime output:', result);
    return result;
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
