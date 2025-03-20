
import { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from "@/types/messaging";

export const useMessageListState = (messages: Message[], channelId: string) => {
  // UI state with reduced dependencies
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  
  // Main state flags
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showSkeletons, setShowSkeletons] = useState(true);
  
  // Stability and control flags
  const initialSkeletonsShown = useRef(false);
  const lastChannelIdRef = useRef<string>('');
  const scrollToBottomFlag = useRef<boolean>(true);
  const hadMessagesRef = useRef<boolean>(false);
  const stableRenderRef = useRef<boolean>(false);
  const messageStabilityTimer = useRef<NodeJS.Timeout | null>(null);
  const updateLockRef = useRef<boolean>(false);
  const renderStabilityCounter = useRef<number>(0);
  const lastMessageSignature = useRef<string>("");
  const uiUpdateScheduled = useRef<boolean>(false);
  
  // Track if we've received messages
  const trackMessages = useCallback(() => {
    if (messages.length > 0) {
      hadMessagesRef.current = true;
      
      // Create a signature of current messages for stable comparisons
      const currentSignature = messages.slice(0, 10).map(m => m.id).join(',');
      if (currentSignature === lastMessageSignature.current) {
        // Skip unnecessary updates
        return false;
      }
      lastMessageSignature.current = currentSignature;
      return true;
    }
    return false;
  }, [messages]);

  // Check for message updates
  useEffect(() => {
    // Skip if update is locked
    if (updateLockRef.current) return;
    
    const messagesChanged = trackMessages();
    if (!messagesChanged && hadMessagesRef.current) return;
  }, [messages, trackMessages]);

  // Control skeleton display with fixed transition timing
  useEffect(() => {
    // Avoid conflicting updates
    if (updateLockRef.current || uiUpdateScheduled.current) return;
    
    // Set update lock
    updateLockRef.current = true;
    uiUpdateScheduled.current = true;
    
    // Clear existing timers
    if (messageStabilityTimer.current) {
      clearTimeout(messageStabilityTimer.current);
      messageStabilityTimer.current = null;
    }
    
    // Reset on channel change
    if (lastChannelIdRef.current !== channelId) {
      setShowSkeletons(true);
      initialSkeletonsShown.current = true;
      lastChannelIdRef.current = channelId;
      scrollToBottomFlag.current = true;
      stableRenderRef.current = false;
      renderStabilityCounter.current = 0;
    }
    
    if (messages.length > 0) {
      // Use fixed delay for showing actual messages
      messageStabilityTimer.current = setTimeout(() => {
        setShowSkeletons(false);
        setIsInitialLoad(false);
        stableRenderRef.current = true;
        renderStabilityCounter.current += 1;
        
        // Release locks after short delay
        setTimeout(() => {
          updateLockRef.current = false;
          uiUpdateScheduled.current = false;
        }, 100);
      }, 800);
      
      return () => {
        if (messageStabilityTimer.current) {
          clearTimeout(messageStabilityTimer.current);
          messageStabilityTimer.current = null;
        }
        updateLockRef.current = false;
        uiUpdateScheduled.current = false;
      };
    } else {
      // Release locks if no messages
      updateLockRef.current = false;
      uiUpdateScheduled.current = false;
    }
  }, [messages.length, channelId]);

  // Complete reset when channel changes
  useEffect(() => {
    // Stop any pending timers
    if (messageStabilityTimer.current) {
      clearTimeout(messageStabilityTimer.current);
      messageStabilityTimer.current = null;
    }
    
    // Reset all state for new channel
    updateLockRef.current = true;
    scrollToBottomFlag.current = true;
    setIsInitialLoad(true);
    initialSkeletonsShown.current = false;
    stableRenderRef.current = false;
    renderStabilityCounter.current = 0;
    lastMessageSignature.current = "";
    setShowSkeletons(true);
    
    // Force scroll on channel change
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        stableRenderRef.current = true;
        renderStabilityCounter.current += 1;
        
        // Release update lock
        setTimeout(() => {
          updateLockRef.current = false;
        }, 100);
      }
    }, 800);
    
    return () => {
      clearTimeout(timer);
      updateLockRef.current = false;
    };
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
