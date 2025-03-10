
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const useTimeFormat = () => {
  const getTimeFromString = (dateString: string | null) => {
    if (!dateString) return '';
    // Extract HH:mm directly from ISO string
    return dateString.slice(11, 16);
  };

  const getDateDisplay = (dateString: string | null, formatStr: string = 'd MMMM') => {
    if (!dateString) return '';
    // Parse date but preserve the original time by explicitly setting hours/minutes
    const [datePart, timePart] = dateString.split('T');
    const [hours, minutes] = (timePart || '').split(':');
    const date = new Date(datePart);
    date.setHours(parseInt(hours || '0', 10));
    date.setMinutes(parseInt(minutes || '0', 10));
    return format(date, formatStr, { locale: fr });
  };

  return {
    getTimeFromString,
    getDateDisplay,
  };
};

