
/**
 * Utility functions for handling dates and times consistently across the application
 */
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const formatTimeString = (dateString: string | null): string => {
  if (!dateString) return '';
  // Format time in French timezone
  return formatInTimeZone(new Date(dateString), 'Europe/Paris', 'HH:mm');
};

export const formatDateDisplay = (dateString: string | null): string => {
  if (!dateString) return '';
  // Format date in French timezone
  const zonedDate = toZonedTime(new Date(dateString), 'Europe/Paris');
  return format(zonedDate, 'EEEE d MMMM yyyy', { locale: fr });
};

export const formatDateTimeDisplay = (dateString: string | null): string => {
  if (!dateString) return '';
  // Format date and time in French timezone
  return formatInTimeZone(
    new Date(dateString),
    'Europe/Paris',
    "EEEE d MMMM yyyy 'à' HH:mm",
    { locale: fr }
  );
};

export const getTimezoneOffset = (): number => {
  return new Date().getTimezoneOffset();
};
