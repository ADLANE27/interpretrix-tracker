
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
      // Simple direct parsing without timezone conversion
      const date = parseISO(dateString);
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
