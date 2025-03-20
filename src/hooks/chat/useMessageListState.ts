
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
  const messageStabilityTimer = useRef<NodeJS.Timeout | null>(null);
  const updateLockRef = useRef<boolean>(false);

  // Check if we've received messages
  useEffect(() => {
    if (messages.length > 0) {
      hadMessagesRef.current = true;
    }
  }, [messages.length]);

  // Transition from skeletons to real messages with fixed delay and lock
  useEffect(() => {
    // Return immediately if update is locked
    if (updateLockRef.current) return;
    
    // Set update lock to prevent concurrent updates
    updateLockRef.current = true;
    
    // Clear any existing timer to prevent stacking effects
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
    }
    
    if (messages.length > 0) {
      // Use a fixed delay to avoid fluctuations
      messageStabilityTimer.current = setTimeout(() => {
        setShowSkeletons(false);
        // Mark rendering as stable after delay
        stableRenderRef.current = true;
        
        // Release lock after state is updated
        setTimeout(() => {
          updateLockRef.current = false;
        }, 100);
      }, 750); // Increased delay for more stability
      
      return () => {
        if (messageStabilityTimer.current) {
          clearTimeout(messageStabilityTimer.current);
          messageStabilityTimer.current = null;
        }
        updateLockRef.current = false;
      };
    } else {
      // Release lock if no messages
      updateLockRef.current = false;
    }
  }, [messages.length, channelId]);

  // More thorough reset when channel changes
  useEffect(() => {
    // Stop any running timers
    if (messageStabilityTimer.current) {
      clearTimeout(messageStabilityTimer.current);
      messageStabilityTimer.current = null;
    }
    
    // Set update lock during channel change
    updateLockRef.current = true;
    
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
          
          // Release lock after state is updated
          setTimeout(() => {
            updateLockRef.current = false;
          }, 100);
        }
      }, 800); // Longer delay for stability
      
      return () => {
        clearTimeout(timer);
        updateLockRef.current = false;
      };
    } else {
      // Release lock if no container
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
    updateLockRef,
    setIsInitialLoad
  };
};
