
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export const useTimestampFormat = () => {
  const formatLastSeen = (lastSeenDate: string | null): string => {
    if (!lastSeenDate) return 'Jamais connecté';
    
    try {
      // Convert UTC date string to local Date object
      const date = new Date(lastSeenDate);
      
      if (!isValid(date)) {
        console.error('[useTimestampFormat] Invalid date:', lastSeenDate);
        return 'Date invalide';
      }

      // If timestamp is in the future, we'll show 'Date invalide'
      if (date.getTime() > Date.now()) {
        console.error('[useTimestampFormat] Future date detected:', lastSeenDate);
        return 'Date invalide';
      }

      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'En ligne';
      
      // For less than an hour, show relative time
      if (diffInMinutes < 60) {
        return formatDistanceToNow(date, { addSuffix: true, locale: fr });
      }

      // Less than 24 hours, show relative time
      if (diffInMinutes < 1440) { // 24 * 60 minutes
        return formatDistanceToNow(date, { addSuffix: true, locale: fr });
      }

      // For dates older than 24 hours, show full date and time in local timezone
      return `Dernière connexion: ${format(date, "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`;
    } catch (error) {
      console.error('[useTimestampFormat] Error formatting date:', error);
      return 'Erreur de date';
    }
  };

  return { formatLastSeen };
};
