
import { useState, useRef, useEffect } from 'react';
import { Message } from "@/types/messaging";

export const useMessageListState = (messages: Message[], channelId: string) => {
  // References for scroll management and state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  
  // Simplified state without circular dependencies
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showSkeletons, setShowSkeletons] = useState(true);
  
  // Flags to control behavior
  const initialSkeletonsShown = useRef(false);
  const lastChannelIdRef = useRef<string>('');
  const scrollToBottomFlag = useRef<boolean>(true);
  const hadMessagesRef = useRef<boolean>(false);
  const stableRenderRef = useRef<boolean>(false);

  // Check if we've received messages
  useEffect(() => {
    if (messages.length > 0) {
      hadMessagesRef.current = true;
    }
  }, [messages.length]);

  // Transition from skeletons to real messages with fixed delay
  useEffect(() => {
    if (!initialSkeletonsShown.current || lastChannelIdRef.current !== channelId) {
      setShowSkeletons(true);
      initialSkeletonsShown.current = true;
      lastChannelIdRef.current = channelId;
      scrollToBottomFlag.current = true;
      stableRenderRef.current = false;
    }
    
    if (messages.length > 0) {
      // Use a fixed delay to avoid fluctuations
      const timer = setTimeout(() => {
        setShowSkeletons(false);
        // Mark rendering as stable after delay
        stableRenderRef.current = true;
      }, 300); // Slightly longer delay for stability
      
      return () => clearTimeout(timer);
    }
  }, [messages.length, channelId]);

  // More thorough reset when channel changes
  useEffect(() => {
    scrollToBottomFlag.current = true;
    setIsInitialLoad(true);
    initialSkeletonsShown.current = false;
    stableRenderRef.current = false;
    setShowSkeletons(true);
    
    // Force scroll after a delay when channel changes
    if (messageContainerRef.current) {
      const timer = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
          // Mark as stable after scrolling
          stableRenderRef.current = true;
        }
      }, 400); // Longer delay for stability
      
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
