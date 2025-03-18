
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const useTimeFormat = () => {
  const getTimeFromString = (dateString: string | null) => {
    if (!dateString) return '';
    return formatInTimeZone(new Date(dateString), 'Europe/Paris', 'HH:mm');
  };

  const getDateDisplay = (dateString: string | null, formatStr: string = 'd MMMM') => {
    if (!dateString) return '';
    const zonedDate = toZonedTime(new Date(dateString), 'Europe/Paris');
    return format(zonedDate, formatStr, { locale: fr });
  };

  return {
    getTimeFromString,
    getDateDisplay,
  };
};
