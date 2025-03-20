
import { useLayoutEffect, useRef } from 'react';
import { Message } from "@/types/messaging";

export const useMessageScroll = (
  messages: Message[],
  isInitialLoad: boolean,
  lastMessageCountRef: React.MutableRefObject<number>,
  messagesEndRef: React.MutableRefObject<HTMLDivElement | null>,
  scrollToBottomFlag: React.MutableRefObject<boolean>,
  messageContainerRef: React.MutableRefObject<HTMLDivElement | null>
) => {
  const isScrolling = useRef(false);
  const lastScrollTop = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialScrollDone = useRef(false);
  const scrollStabilityCounter = useRef(0);
  const scrollLock = useRef(false);
  const lastMessagesLength = useRef(0);
  
  // Utiliser useLayoutEffect pour assurer que le défilement se produit avant le rendu visuel
  useLayoutEffect(() => {
    if (!messageContainerRef.current || messages.length === 0 || scrollLock.current) return;
    
    // Éviter les mises à jour trop fréquentes si le nombre de messages n'a pas changé
    if (messages.length === lastMessagesLength.current && initialScrollDone.current) {
      return;
    }
    
    lastMessagesLength.current = messages.length;
    scrollLock.current = true;
    
    const isNewMessageBatch = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    
    // Stocker la position de défilement actuelle
    if (messageContainerRef.current) {
      lastScrollTop.current = messageContainerRef.current.scrollTop;
    }
    
    // Effacer les délais de défilement précédents
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    
    // Déterminer si nous devons défiler vers le bas
    const container = messageContainerRef.current;
    const userWasAtBottom = container && 
      (container.scrollHeight - container.scrollTop - container.clientHeight < 100);
    
    const shouldScrollToBottom = scrollToBottomFlag.current || 
                               (isNewMessageBatch && userWasAtBottom) || 
                               isInitialLoad || 
                               !initialScrollDone.current;
    
    if (shouldScrollToBottom && messagesEndRef.current) {
      isScrolling.current = true;
      
      // Premier défilement immédiat pour le positionnement
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'auto',
        block: 'end'
      });
      
      // Définir le drapeau de défilement initial
      initialScrollDone.current = true;
      
      // Deuxième défilement avec délai pour la stabilité
      scrollTimeoutRef.current = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: isInitialLoad ? 'auto' : 'smooth',
            block: 'end'
          });
          
          // Réinitialiser le drapeau après le défilement
          if (scrollToBottomFlag.current) {
            scrollToBottomFlag.current = false;
          }
          
          // Délai supplémentaire de stabilisation
          scrollTimeoutRef.current = setTimeout(() => {
            isScrolling.current = false;
            scrollStabilityCounter.current += 1;
            scrollLock.current = false;
            scrollTimeoutRef.current = null;
          }, 300);
        }
      }, 150);
      
    } else if (!shouldScrollToBottom && !isInitialLoad) {
      // Restaurer la position de défilement précédente si l'utilisateur n'était pas en bas
      scrollTimeoutRef.current = setTimeout(() => {
        if (messageContainerRef.current) {
          messageContainerRef.current.scrollTop = lastScrollTop.current;
          
          scrollTimeoutRef.current = setTimeout(() => {
            isScrolling.current = false;
            scrollStabilityCounter.current += 1;
            scrollLock.current = false;
            scrollTimeoutRef.current = null;
          }, 150);
        }
      }, 50);
    } else {
      // Libérer le verrou de défilement après un court délai
      scrollTimeoutRef.current = setTimeout(() => {
        isScrolling.current = false;
        scrollStabilityCounter.current += 1;
        scrollLock.current = false;
        scrollTimeoutRef.current = null;
      }, 250);
    }
    
    // Nettoyage du délai lors du démontage
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
        scrollLock.current = false;
      }
    };
  }, [messages, isInitialLoad, messagesEndRef, lastMessageCountRef, scrollToBottomFlag, messageContainerRef]);
};
