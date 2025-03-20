
import { Message } from "@/types/messaging";
import { organizeMessageThreads } from './messageUtils';
import { useRef, useCallback } from 'react';

export const useMessageOrganizer = (messages: Message[]) => {
  const lastOrganizedMessages = useRef<Message[]>([]);
  const organizedCache = useRef<ReturnType<typeof organizeMessageThreads> | null>(null);
  const cacheVersion = useRef<number>(0);
  const processingFlag = useRef<boolean>(false);
  const cacheInvalidationTimer = useRef<NodeJS.Timeout | null>(null);
  const messagesStableVersionRef = useRef<string>("");
  
  // Fonction améliorée pour organiser les fils de messages avec mise en cache renforcée
  // pour éviter les réorganisations coûteuses
  const organizeThreads = useCallback(() => {
    // Ne pas réorganiser si déjà en cours de traitement
    if (processingFlag.current) {
      return organizedCache.current || { rootMessages: [], messageThreads: {} };
    }
    
    processingFlag.current = true;
    
    try {
      // Vérification rapide par référence pour la performance
      if (messages === lastOrganizedMessages.current && organizedCache.current) {
        return organizedCache.current;
      }
      
      // Créer une signature stable des messages pour la comparaison
      const newMessagesStableVersion = messages.length > 0 ? 
        messages.map(m => m.id).join(',') : "";
      
      // Si la signature est la même, utiliser le cache
      if (newMessagesStableVersion === messagesStableVersionRef.current && organizedCache.current) {
        return organizedCache.current;
      }
      
      // Vérification d'égalité profonde (basée uniquement sur l'ID pour la performance)
      const sameMessageList = messages.length === lastOrganizedMessages.current.length &&
        messages.every((msg, i) => msg.id === lastOrganizedMessages.current[i]?.id);
      
      if (sameMessageList && organizedCache.current) {
        return organizedCache.current;
      }
      
      // Si les messages ont changé, réorganiser et mettre à jour le cache
      const result = organizeMessageThreads(messages);
      
      // Nettoyer les anciennes références pour éviter les fuites de mémoire
      if (cacheInvalidationTimer.current) {
        clearTimeout(cacheInvalidationTimer.current);
      }
      
      // Mettre à jour le cache
      lastOrganizedMessages.current = [...messages];
      organizedCache.current = result;
      cacheVersion.current += 1;
      messagesStableVersionRef.current = newMessagesStableVersion;
      
      return result;
    } finally {
      // Assurer que le drapeau est libéré même en cas d'erreur
      setTimeout(() => {
        processingFlag.current = false;
      }, 50);
    }
  }, [messages]);

  return { 
    organizeThreads,
    cacheVersion: cacheVersion.current
  };
};
