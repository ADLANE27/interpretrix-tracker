
import { useRef, useCallback } from 'react';
import { Message } from '@/types/messaging';

interface MessageCache {
  [channelId: string]: {
    messages: Message[];
    lastFetched: number;
    totalCount?: number;
  };
}

export const useMessageCache = (ttl = 15 * 1000) => { // Reduced TTL to 15 seconds for more frequent refreshes
  const cache = useRef<MessageCache>({});

  const getCachedMessages = useCallback((channelId: string, forceFresh = false) => {
    const cachedData = cache.current[channelId];
    const now = Date.now();
    
    if (!forceFresh && cachedData && now - cachedData.lastFetched < ttl) {
      console.log(`[Chat] Using cached messages for channel: ${channelId}, age: ${now - cachedData.lastFetched}ms`);
      // Only return cache if it's not empty
      if (cachedData.messages.length > 0) {
        return cachedData.messages;
      }
      console.log('[Chat] Cache exists but is empty, forcing refresh');
      return null;
    }
    
    console.log(`[Chat] ${forceFresh ? 'Force refresh' : 'Cache expired'} for key: ${channelId}`);
    return null;
  }, [ttl]);

  const setCachedMessages = useCallback((channelId: string, messages: Message[], totalCount?: number) => {
    if (!messages || messages.length === 0) {
      console.log(`[Chat] Not caching empty messages array for channel: ${channelId}`);
      return;
    }
    
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
      
      cache.current[channelId] = {
        messages: cachedMessages,
        lastFetched: Date.now(), // Update the timestamp to reflect fresh data
        totalCount: cache.current[channelId].totalCount
      };
      console.log(`[Chat] Updated cached message ${message.id} in channel: ${channelId}`);
    }
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
      // Add new message at the beginning of the array for chronological order
      cachedMessages.unshift(message);
    }
    
    cache.current[channelId] = {
      messages: cachedMessages,
      lastFetched: Date.now(), // Always update timestamp when adding messages
      totalCount: (cache.current[channelId].totalCount || 0) + (existingIndex >= 0 ? 0 : 1)
    };
    
    console.log(`[Chat] ${existingIndex >= 0 ? 'Updated' : 'Added new'} message in cache for channel: ${channelId}`);
  }, []);

  const removeMessageFromCache = useCallback((channelId: string, messageId: string) => {
    if (!cache.current[channelId]) return;
    
    const cachedMessages = cache.current[channelId].messages.filter(msg => msg.id !== messageId);
    
    cache.current[channelId] = {
      messages: cachedMessages,
      lastFetched: Date.now(), // Update timestamp to reflect change
      totalCount: Math.max(0, (cache.current[channelId].totalCount || 0) - 1)
    };
    
    console.log(`[Chat] Removed message ${messageId} from cache for channel: ${channelId}`);
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

  // Check if cache is stale (older than TTL)
  const isCacheStale = useCallback((channelId: string) => {
    const cachedData = cache.current[channelId];
    if (!cachedData) return true;
    
    const now = Date.now();
    return now - cachedData.lastFetched >= ttl;
  }, [ttl]);

  return {
    getCachedMessages,
    setCachedMessages,
    updateCachedMessage,
    addMessageToCache,
    removeMessageFromCache,
    invalidateCache,
    isCacheStale
  };
};
