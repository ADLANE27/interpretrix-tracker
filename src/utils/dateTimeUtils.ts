
/**
 * Utility functions for handling dates and times consistently across the application
 */
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

export const formatTimeString = (dateString: string | null): string => {
  if (!dateString) return '';
  return formatInTimeZone(new Date(dateString), 'Europe/Paris', 'HH:mm');
};

export const formatDateDisplay = (dateString: string | null): string => {
  if (!dateString) return '';
  const zonedDate = toZonedTime(new Date(dateString), 'Europe/Paris');
  return format(zonedDate, 'EEEE d MMMM yyyy', { locale: fr });
};

export const formatDateTimeDisplay = (dateString: string | null): string => {
  if (!dateString) return '';
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

export const toUTCString = (date: string, time: string): string => {
  const localDate = new Date(`${date}T${time}`);
  const zonedDate = fromZonedTime(localDate, 'Europe/Paris');
  return zonedDate.toISOString();
};

