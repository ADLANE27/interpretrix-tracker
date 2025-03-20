
import { useState, useRef, useEffect } from 'react';
import { Message } from "@/types/messaging";

export const useMessageListState = (messages: Message[], channelId: string) => {
  // Références pour gérer le scroll et l'état
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  
  // État simplifié sans dépendances circulaires
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showSkeletons, setShowSkeletons] = useState(true);
  
  // Flags pour contrôler le comportement
  const initialSkeletonsShown = useRef(false);
  const lastChannelIdRef = useRef<string>('');
  const scrollToBottomFlag = useRef<boolean>(true);
  const hadMessagesRef = useRef<boolean>(false);
  const stableRenderRef = useRef<boolean>(false);

  // Vérifier si nous avons reçu des messages
  useEffect(() => {
    if (messages.length > 0) {
      hadMessagesRef.current = true;
    }
  }, [messages.length]);

  // Transition des squelettes vers les messages réels avec délai fixe
  useEffect(() => {
    if (!initialSkeletonsShown.current || lastChannelIdRef.current !== channelId) {
      setShowSkeletons(true);
      initialSkeletonsShown.current = true;
      lastChannelIdRef.current = channelId;
      scrollToBottomFlag.current = true;
      stableRenderRef.current = false;
    }
    
    if (messages.length > 0) {
      // Utiliser un délai fixe pour éviter les fluctuations
      const timer = setTimeout(() => {
        setShowSkeletons(false);
        // Marquer le rendu comme stable après le délai
        stableRenderRef.current = true;
      }, 300); // Délai un peu plus long pour assurer la stabilité
      
      return () => clearTimeout(timer);
    }
  }, [messages.length, channelId]);

  // Réinitialisation plus complète lors du changement de canal
  useEffect(() => {
    scrollToBottomFlag.current = true;
    setIsInitialLoad(true);
    initialSkeletonsShown.current = false;
    stableRenderRef.current = false;
    setShowSkeletons(true);
    
    // Forcer le défilement après un délai lors du changement de canal
    if (messageContainerRef.current) {
      const timer = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
          // Marquer comme stable après le défilement
          stableRenderRef.current = true;
        }
      }, 400); // Délai plus long pour assurer la stabilité
      
      return () => clearTimeout(timer);
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
    setIsInitialLoad
  };
};
