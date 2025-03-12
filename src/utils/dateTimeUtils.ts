
/**
 * Utility functions for handling dates and times consistently across the application
 */

export const formatTimeString = (dateString: string | null): string => {
  if (!dateString) return '';
  // Extract HH:mm from ISO string without any timezone conversion
  return dateString.slice(11, 16);
};

export const formatDateDisplay = (dateString: string | null): string => {
  if (!dateString) return '';
  // Create Date object from ISO string
  const date = new Date(dateString);
  // Format the date in French locale using Intl
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return formatter.format(date);
};

export const formatDateTimeDisplay = (dateString: string | null): string => {
  if (!dateString) return '';
  return `${formatDateDisplay(dateString)} à ${formatTimeString(dateString)}`;
};

export const getTimezoneOffset = (): number => {
  return new Date().getTimezoneOffset();
};

