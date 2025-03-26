
/**
 * Utility functions for handling dates and times consistently across the application
 */

import { format, parseISO, differenceInSeconds, differenceInMinutes, differenceInHours } from 'date-fns';
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
    // Parse without timezone conversion
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
};

// Format countdown display for missions
export const formatCountdown = (targetDate: Date, now: Date): string => {
  console.log(`[formatCountdown] Target: ${targetDate.toISOString()}, Now: ${now.toISOString()}`);
  
  // First check if mission has already started
  if (now >= targetDate) {
    return "En cours";
  }
  
  const diffSeconds = differenceInSeconds(targetDate, now);
  
  if (diffSeconds <= 0) {
    return "Maintenant";
  }
  
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;
  
  if (hours > 0) {
    return `Dans ${hours}h${minutes > 0 ? minutes + 'min' : ''}`;
  } else if (minutes > 0) {
    return `Dans ${minutes}min${minutes < 10 ? seconds + 's' : ''}`;
  } else {
    return `Dans ${seconds}s`;
  }
};
