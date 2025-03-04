
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Just format the date string, no timezone handling
export const formatFrenchTime = (date: Date | string, formatString: string) => {
  try {
    // If it's a string, parse it while preserving the time
    if (typeof date === 'string') {
      const [datePart, timePart] = date.split('T');
      const [hours, minutes] = (timePart || '').split(':');
      const parsedDate = new Date(datePart);
      parsedDate.setHours(parseInt(hours || '0', 10));
      parsedDate.setMinutes(parseInt(minutes || '0', 10));
      return format(parsedDate, formatString, { locale: fr });
    }
    return format(date, formatString, { locale: fr });
  } catch (error) {
    console.error('Error in formatFrenchTime:', error);
    return '';
  }
};

// Create a Date object without any timezone adjustment
export const toFrenchTime = (date: string | Date) => {
  try {
    if (typeof date === 'string') {
      const [datePart, timePart] = date.split('T');
      if (datePart && timePart) {
        const [hours, minutes] = timePart.split(':');
        const newDate = new Date(datePart);
        newDate.setHours(parseInt(hours, 10));
        newDate.setMinutes(parseInt(minutes, 10));
        return newDate;
      }
    }
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
