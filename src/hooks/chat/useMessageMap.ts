
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
  const debounceUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdates = useRef<Set<string>>(new Set());
  
  // Mise à jour du tableau de messages avec limitation du taux pour éviter les rendus trop fréquents
  const updateMessagesArray = useCallback(() => {
    updateCounter.current += 1;
    const currentUpdateId = updateCounter.current;
    messagesVersion.current += 1;
    
    // Éviter les mises à jour trop fréquentes
    if (updateScheduled.current) {
      return;
    }
    
    // Nettoyer les timers existants pour éviter les conflits
    if (batchUpdateTimer.current) {
      clearTimeout(batchUpdateTimer.current);
      batchUpdateTimer.current = null;
    }
    
    if (debounceUpdateTimer.current) {
      clearTimeout(debounceUpdateTimer.current);
      debounceUpdateTimer.current = null;
    }
    
    updateScheduled.current = true;
    
    // Utiliser setTimeout au lieu de requestAnimationFrame pour plus de stabilité
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
          // Tri stable et cohérent par horodatage
          const timeA = normalizeTimestampForSorting(a.timestamp);
          const timeB = normalizeTimestampForSorting(b.timestamp);
          
          if (timeA === timeB) {
            // Tri secondaire par ID pour assurer l'unicité
            return a.id.localeCompare(b.id);
          }
          
          return timeA - timeB;
        });
      
      // Vérifier si les messages ont réellement changé pour éviter les rendus inutiles
      // Utiliser un système de comparaison plus robuste
      const messagesChanged = 
        updatedMessages.length !== lastSortedMessages.current.length ||
        updatedMessages.some((msg, idx) => {
          const prevMsg = lastSortedMessages.current[idx];
          // Vérification plus approfondie des changements
          return !prevMsg || 
                 msg.id !== prevMsg.id || 
                 (msg.reactions && JSON.stringify(msg.reactions) !== JSON.stringify(prevMsg.reactions)) ||
                 (msg.attachments && msg.attachments.length !== prevMsg.attachments.length);
        });
      
      // Ne mettre à jour que si quelque chose a changé
      if (messagesChanged) {
        console.log(`[useMessageMap] Update ${currentUpdateId}: Updating messages array with ${updatedMessages.length} messages`);
        lastSortedMessages.current = updatedMessages;
        
        // Opération groupée: un setter au lieu de plusieurs
        setMessages(updatedMessages.slice()); // Créer une nouvelle référence pour garantir le re-rendu
        
        // Planifier une seconde mise à jour après un délai pour assurer la cohérence
        debounceUpdateTimer.current = setTimeout(() => {
          debounceUpdateTimer.current = null;
          // Vérifier à nouveau si nous avons besoin d'une mise à jour
          const currentMessages = Array.from(messagesMap.current.values())
            .sort((a, b) => normalizeTimestampForSorting(a.timestamp) - normalizeTimestampForSorting(b.timestamp));
            
          // Ne mettre à jour que si nécessaire
          if (currentMessages.length !== lastSortedMessages.current.length) {
            console.log(`[useMessageMap] Secondary update: Length changed, updating UI`);
            lastSortedMessages.current = currentMessages;
            setMessages(currentMessages.slice());
          }
        }, 500);
      } else {
        console.log(`[useMessageMap] Update ${currentUpdateId}: Messages unchanged, skipping update`);
      }
    }, 200); // Délai plus long pour la stabilité
    
  }, [messages]);

  return {
    messages,
    setMessages,
    messagesMap,
    updateMessagesArray,
    updateCounter,
    updateScheduled,
    messagesVersion,
    lastSortedMessages,
    pendingUpdates
  };
};
