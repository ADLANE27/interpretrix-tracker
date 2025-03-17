
import { useRef, useCallback } from 'react';

interface SenderInfo {
  id: string;
  name: string;
  avatarUrl: string;
}

interface SenderCache {
  [senderId: string]: {
    data: SenderInfo;
    lastFetched: number;
  };
}

export const useSenderCache = (ttl = 15 * 60 * 1000) => { // 15 minutes default TTL
  const cache = useRef<SenderCache>({});

  const getCachedSender = useCallback((senderId: string) => {
    const cachedData = cache.current[senderId];
    const now = Date.now();
    
    if (cachedData && now - cachedData.lastFetched < ttl) {
      return cachedData.data;
    }
    
    return null;
  }, [ttl]);

  const setCachedSender = useCallback((senderId: string, senderInfo: SenderInfo) => {
    cache.current[senderId] = {
      data: senderInfo,
      lastFetched: Date.now()
    };
  }, []);

  const batchGetCachedSenders = useCallback((senderIds: string[]) => {
    const now = Date.now();
    const cached: { [id: string]: SenderInfo } = {};
    const uncachedIds: string[] = [];
    
    senderIds.forEach(id => {
      const cachedData = cache.current[id];
      if (cachedData && now - cachedData.lastFetched < ttl) {
        cached[id] = cachedData.data;
      } else {
        uncachedIds.push(id);
      }
    });
    
    return { cached, uncachedIds };
  }, [ttl]);

  const batchSetCachedSenders = useCallback((senders: SenderInfo[]) => {
    const now = Date.now();
    senders.forEach(sender => {
      cache.current[sender.id] = {
        data: sender,
        lastFetched: now
      };
    });
  }, []);

  return {
    getCachedSender,
    setCachedSender,
    batchGetCachedSenders,
    batchSetCachedSenders
  };
};
