
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatTimeString, formatDateDisplay } from '@/utils/dateTimeUtils';

export const useTimeFormat = () => {
  const getTimeFromString = (dateString: string | null) => {
    return formatTimeString(dateString);
  };

  const getDateDisplay = (dateString: string | null, formatStr: string = 'd MMMM') => {
    if (!dateString) return '';
    
    try {
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
