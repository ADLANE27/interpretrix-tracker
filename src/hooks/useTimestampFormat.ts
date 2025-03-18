
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export const useTimestampFormat = () => {
  const formatLastSeen = (lastSeenDate: string | null): string => {
    if (!lastSeenDate) return 'Jamais connecté';
    
    try {
      // Parse the UTC date string
      const date = new Date(lastSeenDate);
      
      if (!isValid(date)) {
        console.error('[useTimestampFormat] Invalid date:', lastSeenDate);
        return 'Date invalide';
      }

      // If timestamp is in the future compared to the user's local time, we'll show 'Date invalide'
      if (date.getTime() > Date.now()) {
        console.error('[useTimestampFormat] Future date detected:', lastSeenDate);
        return 'Date invalide';
      }

      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      // If less than a minute ago, show "En ligne"
      if (diffInMinutes < 1) {
        return 'En ligne';
      }
      
      // For less than an hour, show relative time
      if (diffInMinutes < 60) {
        return formatDistanceToNow(date, { addSuffix: true, locale: fr });
      }

      // Less than 24 hours, show relative time as well
      if (diffInMinutes < 1440) { // 24 * 60 minutes
        return formatDistanceToNow(date, { addSuffix: true, locale: fr });
      }

      // For any older date, show the exact date and time
      return format(date, "dd/MM/yyyy 'à' HH:mm", { locale: fr });
    } catch (error) {
      console.error('[useTimestampFormat] Error formatting date:', error);
      return 'Erreur de date';
    }
  };

  // Add a new function for formatting message timestamps consistently
  const formatMessageTime = (date: Date | string): string => {
    try {
      const messageDate = typeof date === 'string' ? new Date(date) : date;
      
      if (!isValid(messageDate)) {
        console.error('[useTimestampFormat] Invalid message date:', date);
        return '--:--';
      }
      
      // Format time as HH:MM in 24-hour format
      return format(messageDate, 'HH:mm', { locale: fr });
    } catch (error) {
      console.error('[useTimestampFormat] Error formatting message time:', error);
      return '--:--';
    }
  };

  return { formatLastSeen, formatMessageTime };
};
