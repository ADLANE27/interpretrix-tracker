import { useState, useRef, useEffect } from 'react';
import { Message } from "@/types/messaging";

export const useMessageListState = (messages: Message[], channelId: string) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hadMessagesRef = useRef<boolean>(false);
  const stableMessages = useRef<Message[]>([]);
  const messageIdsRef = useRef<string[]>([]);
  const lastStableUpdateTimestamp = useRef<number>(Date.now());
  const [showSkeletons, setShowSkeletons] = useState(true);
  const initialSkeletonsShown = useRef(false);
  const lastChannelIdRef = useRef<string>('');
  const scrollToBottomFlag = useRef<boolean>(true);

  // Check if message list actually changed (by content, not just by reference)
  useEffect(() => {
    if (messages.length > 0) {
      const currentMessageIds = messages.map(m => m.id).join(',');
      const previousMessageIds = messageIdsRef.current.join(',');
      
      if (currentMessageIds !== previousMessageIds) {
        messageIdsRef.current = messages.map(m => m.id);
        
        // Only update stable messages if content actually changed
        stableMessages.current = [...messages];
        lastStableUpdateTimestamp.current = Date.now();
        hadMessagesRef.current = true;
      }
      
      // Once we have real messages, we're no longer in initial load state
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [messages, isInitialLoad]);

  // Show skeletons immediately on mount, keep them until real messages arrive
  useEffect(() => {
    if (!initialSkeletonsShown.current || lastChannelIdRef.current !== channelId) {
      setShowSkeletons(true);
      initialSkeletonsShown.current = true;
      lastChannelIdRef.current = channelId;
      scrollToBottomFlag.current = true;
    }
    
    if (messages.length > 0) {
      // Remove skeletons once we have real messages with a very small delay
      const timer = setTimeout(() => {
        setShowSkeletons(false);
      }, 50); // Very short delay for smoother transition
      
      return () => clearTimeout(timer);
    }
  }, [messages.length, channelId]);

  // When channel changes, reset auto-scroll flag
  useEffect(() => {
    scrollToBottomFlag.current = true;
    setIsInitialLoad(true);
    initialSkeletonsShown.current = false;
    setShowSkeletons(true);
    messageIdsRef.current = [];
    
    // Force scroll to bottom after a small delay when channel changes
    if (messageContainerRef.current) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 200);
    }
  }, [channelId]);

  return {
    messagesEndRef,
    messageContainerRef,
    lastMessageCountRef,
    isInitialLoad,
    hadMessagesRef,
    stableMessages,
    showSkeletons,
    scrollToBottomFlag,
    setIsInitialLoad
  };
};
