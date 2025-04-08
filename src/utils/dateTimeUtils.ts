
/**
 * Utility functions for handling dates and times consistently across the application
 */

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Extract time (HH:mm) from ISO string without any timezone conversion
export const formatTimeString = (dateString: string | null): string => {
  if (!dateString) return '';
  
  try {
    // Just extract the time portion directly from the string
    if (dateString.includes('T')) {
      return dateString.split('T')[1].substring(0, 5);
    }
    
    // Fallback to parsing if not in expected format
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
    // Parse the ISO string directly without timezone adjustments
    const date = parseISO(dateString);
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  } catch (error) {
    console.error('[dateTimeUtils] Error formatting date display:', error);
    return '';
  }
};

// Format date and time together for display - preserving original time
export const formatDateTimeDisplay = (dateString: string | null): string => {
  if (!dateString) return '';
  
  try {
    // Extract original time directly from string
    const originalTime = formatTimeString(dateString);
    const date = parseISO(dateString);
    const formattedDate = format(date, 'EEEE d MMMM yyyy', { locale: fr });
    return `${formattedDate} à ${originalTime}`;
  } catch (error) {
    console.error('[dateTimeUtils] Error formatting datetime display:', error);
    return '';
  }
};

// Helper function to create ISO strings without the 'Z' suffix (UTC marker)
export const createLocalISOString = (date: string, time: string): string => {
  // Simply concatenate date and time without adding Z marker
  return `${date}T${time}:00`;
}
