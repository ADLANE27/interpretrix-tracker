
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatTimeString, formatDateDisplay } from '@/utils/dateTimeUtils';

export const useTimeFormat = () => {
  // Get time directly from string without any parsing or timezone conversion
  const getTimeFromString = (dateString: string | null) => {
    return formatTimeString(dateString);
  };

  const getDateDisplay = (dateString: string | null, formatStr: string = 'd MMMM') => {
    if (!dateString) return '';
    
    try {
      // Extract date part without timezone considerations
      const datePart = dateString.split('T')[0];
      
      // Create a date object directly from the date part without timezone shifts
      const date = new Date(`${datePart}T00:00:00`);
      return format(date, formatStr, { locale: fr });
    } catch (error) {
      console.error('[useTimeFormat] Error formatting date:', error);
      return '';
    }
  };

  return {
    getTimeFromString,
    getDateDisplay,
  };
};
