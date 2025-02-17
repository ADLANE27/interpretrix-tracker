
import { useEffect, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
}

export function useCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig = { ttl: 5 * 60 * 1000 } // 5 minutes default TTL
) {
  const cache = useRef<Map<string, CacheEntry<T>>>(
    new Map()
  );

  const getCachedData = async () => {
    const cached = cache.current.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < config.ttl) {
      console.log(`[Cache] Hit for key: ${key}`);
      return cached.data;
    }

    console.log(`[Cache] Miss for key: ${key}, fetching fresh data`);
    const freshData = await fetchFn();
    cache.current.set(key, {
      data: freshData,
      timestamp: now,
    });

    return freshData;
  };

  const invalidateCache = () => {
    console.log(`[Cache] Invalidating key: ${key}`);
    cache.current.delete(key);
  };

  return { getCachedData, invalidateCache };
}
