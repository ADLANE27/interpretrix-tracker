
import { useState, useCallback, useRef } from 'react';
import { Message } from '@/types/messaging';
import { normalizeTimestampForSorting } from '@/utils/dateTimeUtils';

export const useMessageMap = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesMap = useRef<Map<string, Message>>(new Map());
  const updateCounter = useRef<number>(0);
  const updateScheduled = useRef<boolean>(false);
  const messagesVersion = useRef<number>(0);
  const lastSortedMessages = useRef<Message[]>([]);
  const batchUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Mise à jour du tableau de messages avec limitation du taux pour éviter les rendus trop fréquents
  const updateMessagesArray = useCallback(() => {
    updateCounter.current += 1;
    const currentUpdateId = updateCounter.current;
    messagesVersion.current += 1;
    
    // Éviter les mises à jour trop fréquentes
    if (updateScheduled.current) {
      return;
    }
    
    updateScheduled.current = true;
    
    // Utiliser setTimeout au lieu de requestAnimationFrame pour plus de stabilité
    if (batchUpdateTimer.current) {
      clearTimeout(batchUpdateTimer.current);
    }
    
    batchUpdateTimer.current = setTimeout(() => {
      updateScheduled.current = false;
      batchUpdateTimer.current = null;
      
      // Ne pas mettre à jour s'il n'y a pas de messages et que nous avons déjà défini un tableau vide
      if (messagesMap.current.size === 0 && messages.length === 0) {
        console.log(`[useMessageMap] Update ${currentUpdateId}: No messages, skipping update`);
        return;
      }

      if (messagesMap.current.size === 0) {
        console.log(`[useMessageMap] Update ${currentUpdateId}: Setting empty messages array`);
        setMessages([]);
        lastSortedMessages.current = [];
        return;
      }

      // Trier les messages par leur horodatage normalisé pour plus de cohérence
      const updatedMessages = Array.from(messagesMap.current.values())
        .sort((a, b) => {
          const timeA = normalizeTimestampForSorting(a.timestamp);
          const timeB = normalizeTimestampForSorting(b.timestamp);
          return timeA - timeB;
        });
      
      // Vérifier si les messages ont réellement changé pour éviter les rendus inutiles
      const messagesChanged = 
        updatedMessages.length !== lastSortedMessages.current.length ||
        updatedMessages.some((msg, idx) => {
          const prevMsg = lastSortedMessages.current[idx];
          return !prevMsg || msg.id !== prevMsg.id;
        });
      
      // Ne mettre à jour que si quelque chose a changé
      if (messagesChanged) {
        console.log(`[useMessageMap] Update ${currentUpdateId}: Updating messages array with ${updatedMessages.length} messages`);
        lastSortedMessages.current = updatedMessages;
        setMessages([...updatedMessages]); // Créer une nouvelle référence pour garantir le re-rendu
      } else {
        console.log(`[useMessageMap] Update ${currentUpdateId}: Messages unchanged, skipping update`);
      }
    }, 100); // Délai plus long pour la stabilité
    
  }, [messages]);

  return {
    messages,
    setMessages,
    messagesMap,
    updateMessagesArray,
    updateCounter,
    updateScheduled,
    messagesVersion,
    lastSortedMessages
  };
};
