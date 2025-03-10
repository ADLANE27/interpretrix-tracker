
/**
 * Utility functions for handling dates and times consistently across the application
 * Times are stored and displayed exactly as entered without timezone conversion
 */

export const formatTimeString = (timeString: string | null): string => {
  if (!timeString) return '';
  // Extract HH:mm directly from string without any conversion
  return timeString.slice(11, 16);
};

export const formatDateDisplay = (dateString: string | null): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.slice(0, 10).split('-');
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  // Create date without timezone for display only
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return formatter.format(date);
};

export const formatDateTimeDisplay = (dateString: string | null): string => {
  if (!dateString) return '';
  return `${formatDateDisplay(dateString)} à ${formatTimeString(dateString)}`;
};
