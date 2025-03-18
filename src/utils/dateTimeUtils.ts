
/**
 * Utility functions for handling dates and times consistently across the application
 */

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Extract time (HH:mm) from ISO string without timezone conversion
export const formatTimeString = (dateString: string | null): string => {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    return format(date, 'HH:mm', { locale: fr });
  } catch (error) {
    console.error('[dateTimeUtils] Error formatting time string:', error);
    return '';
  }
};

// Format date for display in French locale
export const formatDateDisplay = (dateString: string | null): string => {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  } catch (error) {
    console.error('[dateTimeUtils] Error formatting date display:', error);
    return '';
  }
};

// Format date and time together for display
export const formatDateTimeDisplay = (dateString: string | null): string => {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    return `${format(date, 'EEEE d MMMM yyyy', { locale: fr })} à ${format(date, 'HH:mm', { locale: fr })}`;
  } catch (error) {
    console.error('[dateTimeUtils] Error formatting datetime display:', error);
    return '';
  }
};

// Get browser's timezone offset in minutes
export const getTimezoneOffset = (): number => {
  return new Date().getTimezoneOffset();
};

// Helper function to create ISO strings without the 'Z' suffix (UTC marker)
export const createLocalISOString = (date: string, time: string): string => {
  return `${date}T${time}:00`;
}
