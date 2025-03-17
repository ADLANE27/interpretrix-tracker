
import { useRef, useCallback } from 'react';
import { Message } from '@/types/messaging';

interface MessageCache {
  [channelId: string]: {
    messages: Message[];
    lastFetched: number;
    totalCount?: number;
  };
}

export const useMessageCache = (ttl = 5 * 60 * 1000) => { // 5 minutes default TTL
  const cache = useRef<MessageCache>({});

  const getCachedMessages = useCallback((channelId: string) => {
    const cachedData = cache.current[channelId];
    const now = Date.now();
    
    if (cachedData && now - cachedData.lastFetched < ttl) {
      console.log(`[Chat] Using cached messages for channel: ${channelId}`);
      return cachedData.messages;
    }
    
    return null;
  }, [ttl]);

  const setCachedMessages = useCallback((channelId: string, messages: Message[], totalCount?: number) => {
    console.log(`[Chat] Caching ${messages.length} messages for channel: ${channelId}`);
    
    cache.current[channelId] = {
      messages,
      lastFetched: Date.now(),
      totalCount
    };
  }, []);

  const updateCachedMessage = useCallback((channelId: string, message: Message) => {
    if (!cache.current[channelId]) return;
    
    const cachedMessages = [...cache.current[channelId].messages];
    const existingIndex = cachedMessages.findIndex(msg => msg.id === message.id);
    
    if (existingIndex >= 0) {
      cachedMessages[existingIndex] = message;
    } else {
      cachedMessages.push(message);
    }
    
    cache.current[channelId] = {
      messages: cachedMessages,
      lastFetched: Date.now(),
      totalCount: cache.current[channelId].totalCount
    };
  }, []);

  const addMessageToCache = useCallback((channelId: string, message: Message) => {
    if (!cache.current[channelId]) {
      cache.current[channelId] = {
        messages: [message],
        lastFetched: Date.now()
      };
      return;
    }
    
    const cachedMessages = [...cache.current[channelId].messages];
    const existingIndex = cachedMessages.findIndex(msg => msg.id === message.id);
    
    if (existingIndex >= 0) {
      cachedMessages[existingIndex] = message;
    } else {
      cachedMessages.push(message);
    }
    
    cache.current[channelId] = {
      messages: cachedMessages,
      lastFetched: Date.now(),
      totalCount: (cache.current[channelId].totalCount || 0) + (existingIndex >= 0 ? 0 : 1)
    };
  }, []);

  const removeMessageFromCache = useCallback((channelId: string, messageId: string) => {
    if (!cache.current[channelId]) return;
    
    const cachedMessages = cache.current[channelId].messages.filter(msg => msg.id !== messageId);
    
    cache.current[channelId] = {
      messages: cachedMessages,
      lastFetched: Date.now(),
      totalCount: (cache.current[channelId].totalCount || 0) - 1
    };
  }, []);

  const invalidateCache = useCallback((channelId?: string) => {
    if (channelId) {
      delete cache.current[channelId];
      console.log(`[Chat] Invalidated cache for channel: ${channelId}`);
    } else {
      cache.current = {};
      console.log('[Chat] Invalidated entire message cache');
    }
  }, []);

  return {
    getCachedMessages,
    setCachedMessages,
    updateCachedMessage,
    addMessageToCache,
    removeMessageFromCache,
    invalidateCache
  };
};
