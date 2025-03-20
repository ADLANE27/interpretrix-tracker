
import { useState, useRef, useEffect } from 'react';
import { Message } from "@/types/messaging";

export const useMessageListState = (messages: Message[], channelId: string) => {
  // Références pour gérer le scroll et l'état
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  
  // État simplifié sans dépendances circulaires
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showSkeletons, setShowSkeletons] = useState(true);
  
  // Flags pour contrôler le comportement
  const initialSkeletonsShown = useRef(false);
  const lastChannelIdRef = useRef<string>('');
  const scrollToBottomFlag = useRef<boolean>(true);

  // Transition des squelettes vers les messages réels
  useEffect(() => {
    if (!initialSkeletonsShown.current || lastChannelIdRef.current !== channelId) {
      setShowSkeletons(true);
      initialSkeletonsShown.current = true;
      lastChannelIdRef.current = channelId;
      scrollToBottomFlag.current = true;
    }
    
    if (messages.length > 0) {
      // Délai légèrement plus long pour assurer la stabilité
      const timer = setTimeout(() => {
        setShowSkeletons(false);
      }, 200); // Délai augmenté pour une transition plus stable
      
      return () => clearTimeout(timer);
    }
  }, [messages.length, channelId]);

  // Réinitialisation lors du changement de canal
  useEffect(() => {
    scrollToBottomFlag.current = true;
    setIsInitialLoad(true);
    initialSkeletonsShown.current = false;
    setShowSkeletons(true);
    
    // Forcer le défilement après un délai lors du changement de canal
    if (messageContainerRef.current) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 300); // Délai augmenté pour assurer que les messages sont chargés
    }
  }, [channelId]);

  return {
    messagesEndRef,
    messageContainerRef,
    lastMessageCountRef,
    isInitialLoad,
    showSkeletons,
    scrollToBottomFlag,
    setIsInitialLoad
  };
};
