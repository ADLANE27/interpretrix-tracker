
import { useLayoutEffect } from 'react';
import { Message } from "@/types/messaging";

export const useMessageScroll = (
  messages: Message[],
  isInitialLoad: boolean,
  lastMessageCountRef: React.MutableRefObject<number>,
  messagesEndRef: React.MutableRefObject<HTMLDivElement | null>,
  scrollToBottomFlag: React.MutableRefObject<boolean>,
  messageContainerRef: React.MutableRefObject<HTMLDivElement | null>
) => {
  // Utilisation de useLayoutEffect pour garantir que le défilement se produit avant le rendu visuel
  useLayoutEffect(() => {
    if (!messageContainerRef.current || messages.length === 0) return;
    
    const isNewMessageBatch = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    
    // Déterminer si nous devons défiler vers le bas
    const shouldScrollToBottom = scrollToBottomFlag.current || isNewMessageBatch || isInitialLoad;
    
    if (shouldScrollToBottom && messagesEndRef.current) {
      // Utiliser un système de double défilement pour plus de fiabilité
      // Premier défilement immédiat pour position approximative
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'auto',
          block: 'end'
        });
      }
      
      // Second défilement avec requestAnimationFrame pour assurer la précision
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: isInitialLoad ? 'auto' : 'smooth',
            block: 'end'
          });
          
          // Réinitialiser le flag après le défilement
          if (scrollToBottomFlag.current) {
            scrollToBottomFlag.current = false;
          }
        }
      });
    }
  }, [messages, isInitialLoad, messagesEndRef, lastMessageCountRef, scrollToBottomFlag, messageContainerRef]);
};
