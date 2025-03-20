
import { useState, useRef, useEffect } from 'react';
import { Message } from "@/types/messaging";

export const useMessageListState = (messages: Message[], channelId: string) => {
  // Références pour la gestion du défilement et de l'état
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  
  // État simplifié sans dépendances circulaires
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showSkeletons, setShowSkeletons] = useState(true);
  
  // Drapeaux pour contrôler le comportement
  const initialSkeletonsShown = useRef(false);
  const lastChannelIdRef = useRef<string>('');
  const scrollToBottomFlag = useRef<boolean>(true);
  const hadMessagesRef = useRef<boolean>(false);
  const stableRenderRef = useRef<boolean>(false);
  const messageStabilityTimer = useRef<NodeJS.Timeout | null>(null);
  const updateLockRef = useRef<boolean>(false);
  const renderStabilityCounter = useRef<number>(0);
  const lastStableMessagesSignature = useRef<string>("");

  // Vérifier si nous avons reçu des messages
  useEffect(() => {
    if (messages.length > 0) {
      hadMessagesRef.current = true;
      
      // Créer une signature stable des messages pour éviter les rendus inutiles
      const currentMessagesSignature = messages.map(m => m.id).join(',');
      if (currentMessagesSignature === lastStableMessagesSignature.current) {
        // Éviter les mises à jour d'état si les messages sont les mêmes
        return;
      }
      lastStableMessagesSignature.current = currentMessagesSignature;
    }
  }, [messages]);

  // Transition des squelettes aux messages réels avec délai fixe et verrou
  useEffect(() => {
    // Retourner immédiatement si une mise à jour est verrouillée
    if (updateLockRef.current) return;
    
    // Définir le verrou de mise à jour pour éviter les mises à jour simultanées
    updateLockRef.current = true;
    
    // Effacer tout minuteur existant pour éviter les effets d'accumulation
    if (messageStabilityTimer.current) {
      clearTimeout(messageStabilityTimer.current);
      messageStabilityTimer.current = null;
    }
    
    if (!initialSkeletonsShown.current || lastChannelIdRef.current !== channelId) {
      setShowSkeletons(true);
      initialSkeletonsShown.current = true;
      lastChannelIdRef.current = channelId;
      scrollToBottomFlag.current = true;
      stableRenderRef.current = false;
      renderStabilityCounter.current = 0;
    }
    
    if (messages.length > 0) {
      // Utiliser un délai fixe pour éviter les fluctuations
      messageStabilityTimer.current = setTimeout(() => {
        setShowSkeletons(false);
        // Marquer le rendu comme stable après délai
        stableRenderRef.current = true;
        renderStabilityCounter.current++;
        
        // Libérer le verrou après la mise à jour de l'état
        setTimeout(() => {
          updateLockRef.current = false;
        }, 150);
      }, 1000); // Délai augmenté pour plus de stabilité
      
      return () => {
        if (messageStabilityTimer.current) {
          clearTimeout(messageStabilityTimer.current);
          messageStabilityTimer.current = null;
        }
        updateLockRef.current = false;
      };
    } else {
      // Libérer le verrou s'il n'y a pas de messages
      updateLockRef.current = false;
    }
  }, [messages.length, channelId]);

  // Réinitialisation plus complète lorsque le canal change
  useEffect(() => {
    // Arrêter les minuteries en cours
    if (messageStabilityTimer.current) {
      clearTimeout(messageStabilityTimer.current);
      messageStabilityTimer.current = null;
    }
    
    // Définir le verrou de mise à jour pendant le changement de canal
    updateLockRef.current = true;
    
    scrollToBottomFlag.current = true;
    setIsInitialLoad(true);
    initialSkeletonsShown.current = false;
    stableRenderRef.current = false;
    renderStabilityCounter.current = 0;
    lastStableMessagesSignature.current = "";
    setShowSkeletons(true);
    
    // Forcer le défilement après un délai lorsque le canal change
    if (messageContainerRef.current) {
      const timer = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
          // Marquer comme stable après défilement
          stableRenderRef.current = true;
          renderStabilityCounter.current++;
          
          // Libérer le verrou après la mise à jour de l'état
          setTimeout(() => {
            updateLockRef.current = false;
          }, 150);
        }
      }, 1200); // Délai plus long pour la stabilité
      
      return () => {
        clearTimeout(timer);
        updateLockRef.current = false;
      };
    } else {
      // Libérer le verrou s'il n'y a pas de conteneur
      updateLockRef.current = false;
    }
  }, [channelId]);

  return {
    messagesEndRef,
    messageContainerRef,
    lastMessageCountRef,
    isInitialLoad,
    showSkeletons,
    scrollToBottomFlag,
    hadMessagesRef,
    stableRenderRef,
    renderStabilityCounter,
    updateLockRef,
    setIsInitialLoad
  };
};
