
/**
 * Utility functions for handling dates and times consistently across the application
 */

import { format, parseISO, formatDistanceToNow, differenceInMinutes, isAfter, isBefore } from 'date-fns';
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

// Format countdown time for missions
export const formatCountdown = (targetDate: Date, referenceDate: Date = new Date()): string => {
  try {
    // Get the difference in minutes between the two dates
    const diffMinutes = differenceInMinutes(targetDate, referenceDate);
    
    // Log for debugging
    console.log(`[formatCountdown] Target: ${targetDate.toISOString()}, Reference: ${referenceDate.toISOString()}, Diff: ${diffMinutes}min`);
    
    if (diffMinutes <= 0) {
      return "Maintenant";
    } else if (diffMinutes < 60) {
      return `Dans ${diffMinutes}min`;
    } else if (diffMinutes < 1440) { // Less than a day
      const hours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      return remainingMinutes > 0 
        ? `Dans ${hours}h${remainingMinutes}min` 
        : `Dans ${hours}h`;
    } else {
      return formatDistanceToNow(targetDate, { addSuffix: true, locale: fr });
    }
  } catch (error) {
    console.error('[dateTimeUtils] Error formatting countdown:', error);
    return "Date invalide";
  }
};

// Check if a mission is currently active
export const isMissionActive = (startTime: string, durationMinutes: number): boolean => {
  try {
    const now = new Date();
    const start = parseISO(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    
    return isAfter(now, start) && isBefore(now, end);
  } catch (error) {
    console.error('[dateTimeUtils] Error checking if mission is active:', error);
    return false;
  }
};

// Get time remaining for a mission in minutes
export const getMissionTimeRemaining = (startTime: string, durationMinutes: number): number => {
  try {
    const now = new Date();
    const start = parseISO(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    
    if (isBefore(now, start)) {
      // Mission hasn't started yet, return minutes to start
      return differenceInMinutes(start, now);
    } else if (isAfter(now, end)) {
      // Mission has ended
      return 0;
    } else {
      // Mission is in progress, return minutes remaining
      return differenceInMinutes(end, now);
    }
  } catch (error) {
    console.error('[dateTimeUtils] Error calculating mission time remaining:', error);
    return 0;
  }
};
