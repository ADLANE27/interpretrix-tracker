
import { useRef, useCallback } from 'react';
import { EventCache } from './types';

export const useEventCache = (maxSize: number = 100): EventCache => {
  const seenEvents = useRef<Set<string>>(new Set());
  const lastProcessedEventRef = useRef<string | null>(null);

  const add = useCallback((eventId: string) => {
    lastProcessedEventRef.current = eventId;
    seenEvents.current.add(eventId);
    
    // Limit cache size to prevent memory leaks
    if (seenEvents.current.size > maxSize) {
      const eventsArray = Array.from(seenEvents.current);
      seenEvents.current = new Set(eventsArray.slice(-Math.floor(maxSize / 2)));
    }
  }, [maxSize]);

  const has = useCallback((eventId: string) => {
    return seenEvents.current.has(eventId) || eventId === lastProcessedEventRef.current;
  }, []);

  const cleanup = useCallback(() => {
    seenEvents.current.clear();
    lastProcessedEventRef.current = null;
  }, []);

  return {
    add,
    has,
    cleanup
  };
};
