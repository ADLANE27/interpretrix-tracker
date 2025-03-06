
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export const useTimestampFormat = () => {
  const formatLastSeen = (lastSeenDate: string | null): string => {
    if (!lastSeenDate) return 'Jamais connecté';
    
    try {
      const date = new Date(lastSeenDate);
      
      if (!isValid(date)) {
        console.error('[useTimestampFormat] Invalid date:', lastSeenDate);
        return 'Date invalide';
      }

      // If timestamp is in the future, something is wrong
      if (date > new Date()) {
        console.error('[useTimestampFormat] Future date detected:', lastSeenDate);
        return 'Date invalide';
      }

      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'En ligne';
      if (diffInMinutes < 60) {
        return formatDistanceToNow(date, { addSuffix: true, locale: fr });
      }

      if (diffInMinutes < 1440) { // Less than 24 hours
        return formatDistanceToNow(date, { addSuffix: true, locale: fr });
      }

      return `Dernière connexion: ${format(date, 'dd/MM/yyyy à HH:mm', { locale: fr })}`;
    } catch (error) {
      console.error('[useTimestampFormat] Error formatting date:', error);
      return 'Erreur de date';
    }
  };

  return { formatLastSeen };
};
