
import { useCallback } from 'react';
import { convertToMessageData, fetchChannelType, fetchMessagesFromDb, sortMessagesByTimestamp } from './utils/fetchUtils';
import { useFetchState } from './useFetchState';
import { useBatchProcessor } from './useBatchProcessor';

// Définir un type pour l'interface de traitement des messages
interface MessageProcessingHook {
  messagesMap: React.MutableRefObject<Map<string, any>>;
  updateMessagesArray: () => void;
  setIsLoading: (isLoading: boolean) => void;
  processingMessage: React.MutableRefObject<boolean>;
  lastFetchTimestamp: React.MutableRefObject<string | null>;
  setHasMoreMessages: (hasMore: boolean) => void;
  processMessage: (messageData: any, channelType: 'group' | 'direct') => Promise<void>;
}

export const useFetchMessages = (
  channelId: string,
  messageProcessing: MessageProcessingHook
) => {
  const { 
    messagesMap,
    updateMessagesArray,
    setIsLoading,
    processingMessage,
    lastFetchTimestamp,
    setHasMoreMessages,
    processMessage
  } = messageProcessing;

  // Obtenir la gestion de l'état de récupération
  const { controls, state, debouncedSetLoading, resetFetchState } = useFetchState();
  
  // Obtenir le processeur par lots
  const { processBatch } = useBatchProcessor({
    processMessage,
    updateMessagesArray
  });

  // Fonction de récupération principale
  const fetchMessages = useCallback(async (limit = 100) => {
    const now = Date.now();
    const timeSinceLastFetch = now - controls.lastFetchStartTime.current;
    
    // Appliquer la limitation pour les récupérations répétées
    if (controls.fetchLock.current && 
        !controls.forceInitialLoad.current && 
        timeSinceLastFetch < controls.minimumFetchDelay.current && 
        controls.initialFetchDone.current && 
        !controls.refreshInProgress.current) {
      console.log('[useFetchMessages] Fetch throttled, will retry later');
      setTimeout(() => fetchMessages(limit), controls.minimumFetchDelay.current / 2);
      return;
    }
    
    controls.forceInitialLoad.current = false;
    
    if (!channelId) {
      console.log('[useFetchMessages] No channel ID provided');
      return;
    }

    if (processingMessage.current && !controls.refreshInProgress.current) {
      console.log('[useFetchMessages] Already processing a message');
      return;
    }

    if (controls.activeFetch.current && !controls.refreshInProgress.current) {
      console.log('[useFetchMessages] Active fetch in progress');
      return;
    }

    try {
      controls.fetchLock.current = true;
      controls.lastFetchStartTime.current = now;
      controls.activeFetch.current = true;
      processingMessage.current = true;
      
      // Montrer l'indicateur de chargement seulement lors du tout premier chargement
      if (!controls.initialFetchDone.current) {
        setIsLoading(true);
      } else {
        debouncedSetLoading(true, setIsLoading);
      }
      
      // Obtenir le type de canal
      const channelType = await fetchChannelType(channelId);

      // Effacer les messages s'il s'agit d'une actualisation complète ou du premier chargement
      if (limit >= 150 || controls.refreshInProgress.current || !controls.initialFetchDone.current) {
        messagesMap.current.clear();
      }

      const effectiveLimit = Math.max(limit, 100);
      
      // Récupérer les messages de la base de données - toujours récupérer une quantité décente
      const messages = await fetchMessagesFromDb(channelId, effectiveLimit);
      
      if (!messages || messages.length === 0) {
        // Toujours mettre à jour l'interface utilisateur même lorsqu'il n'y a pas de messages pour afficher l'état vide
        updateMessagesArray();
        setHasMoreMessages(false);
        controls.initialFetchDone.current = true;
        return;
      }
      
      // Trier les messages par horodatage avant de les traiter pour un ordre plus stable
      const sortedMessages = sortMessagesByTimestamp(messages);
      
      console.log(`[useFetchMessages] Processing ${sortedMessages.length} messages in stable order`);
      
      // Traiter les messages par lots
      await processBatch(
        sortedMessages.map(msg => convertToMessageData(msg)), 
        channelType, 
        20
      );
      
      // Mettre à jour le dernier horodatage de récupération et l'état hasMore
      if (sortedMessages.length > 0) {
        lastFetchTimestamp.current = sortedMessages[0].created_at;
        setHasMoreMessages(sortedMessages.length >= effectiveLimit);
      } else {
        setHasMoreMessages(false);
      }
      
      // Mettre à jour l'état
      state.lastFetchTime.current = new Date();
      controls.initialFetchDone.current = true;
      
      // Important: mettre à jour le tableau de messages pour s'assurer que l'interface utilisateur reflète l'état le plus récent
      updateMessagesArray();
      
      // Planifier une mise à jour supplémentaire après un court délai pour s'assurer que tous les messages sont affichés
      // Utiliser des délais progressifs pour une stabilité maximale
      setTimeout(() => { updateMessagesArray(); }, 200);
      setTimeout(() => { updateMessagesArray(); }, 500);
      setTimeout(() => { updateMessagesArray(); }, 1000);
      
      console.log(`[useFetchMessages] Processed ${messagesMap.current.size} messages`);
      
    } catch (error) {
      console.error('[useFetchMessages] Error in fetchMessages:', error);
    } finally {
      if (controls.initialLoadingTimer.current) {
        clearTimeout(controls.initialLoadingTimer.current);
        controls.initialLoadingTimer.current = null;
      }
      
      // Court délai avant de masquer l'indicateur de chargement
      setTimeout(() => {
        debouncedSetLoading(false, setIsLoading);
      }, 500); // Délai augmenté pour une meilleure expérience utilisateur
      
      // Libérer les flags de manière différée pour éviter les conflits
      setTimeout(() => {
        processingMessage.current = false;
      }, 200);
      
      setTimeout(() => {
        controls.activeFetch.current = false;
      }, 300);
      
      setTimeout(() => {
        controls.refreshInProgress.current = false;
      }, 400);
      
      // Libérer le verrou de récupération avec un délai important
      setTimeout(() => {
        controls.fetchLock.current = false;
      }, 800); // Délai augmenté pour éviter les récupérations répétitives
    }
  }, [
    channelId,
    processingMessage,
    debouncedSetLoading,
    messagesMap,
    lastFetchTimestamp,
    setHasMoreMessages,
    updateMessagesArray,
    processMessage,
    setIsLoading,
    controls,
    state,
    processBatch
  ]);

  // Charger plus de messages
  const loadMoreMessages = useCallback(async (
    currentCount: number,
    isCurrentlyLoading: boolean,
    hasMore: boolean
  ) => {
    if (!channelId || isCurrentlyLoading || !hasMore || controls.activeFetch.current) return;
    
    // Augmenter la limite de récupération lors du chargement de plus de messages
    await fetchMessages(currentCount + 50);
  }, [channelId, fetchMessages, controls.activeFetch]);

  // Forcer l'actualisation
  const forceRefresh = useCallback(() => {
    resetFetchState();
    return fetchMessages(200); // Récupérer plus de messages lors de l'actualisation forcée
  }, [fetchMessages, resetFetchState]);

  return {
    fetchMessages,
    loadMoreMessages,
    forceRefresh,
    lastFetchTime: state.lastFetchTime.current,
    initialFetchDone: controls.initialFetchDone.current
  };
};
