import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { realtimeService } from '@/services/realtime';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';

interface UseTableSubscriptionOptions {
  enabled?: boolean;
  onError?: (error: any) => void;
  onConnectionChange?: (connected: boolean) => void; 
  debounceTime?: number;
}

/**
 * A simplified hook for subscribing to a database table's real-time events
 */
export function useTableSubscription(
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  filter: string | null,
  callback: (payload: any) => void,
  options: UseTableSubscriptionOptions = {}
) {
  const { enabled = true, onError, onConnectionChange, debounceTime = 100 } = options;
  const [isConnected, setIsConnected] = useState(true);
  const callbackRef = useRef(callback);
  const cleanupRef = useRef<(() => void) | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set());
  
  // Generate a stable subscription key
  const subscriptionKey = useMemo(() => 
    `${table}:${event}${filter ? `:${filter}` : ''}`, 
    [table, event, filter]
  );
  
  // Keep callback reference updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Debounced callback to prevent duplicate processing
  const debouncedCallback = useCallback((payload: any) => {
    // Create a unique ID for this event
    const eventId = `${payload.eventType}-${
      payload.eventType === 'DELETE' ? 
      (payload.old as any)?.id : 
      (payload.new as any)?.id
    }-${payload.commit_timestamp || Date.now()}`;
    
    // Skip if we've already processed this event
    if (processedEventsRef.current.has(eventId)) {
      return;
    }
    
    // Add to processed events
    processedEventsRef.current.add(eventId);
    
    // Limit size of processed events set
    if (processedEventsRef.current.size > 100) {
      const eventsArray = Array.from(processedEventsRef.current);
      processedEventsRef.current = new Set(eventsArray.slice(-50));
    }
    
    try {
      callbackRef.current(payload);
    } catch (error) {
      console.error(`[useTableSubscription] Error processing ${event} event for ${table}:`, error);
      if (onError) onError(error);
    }
  }, [event, table, onError]);
  
  // Track connection status
  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
      if (onConnectionChange) {
        onConnectionChange(connected);
      }
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    };
  }, [onConnectionChange]);
  
  // Subscribe to the table
  useEffect(() => {
    if (!enabled) return;
    
    // Make sure the service is initialized first
    if (!realtimeService.isInitialized()) {
      realtimeService.init();
    }
    
    // Create subscription through realtime service
    const cleanup = realtimeService.subscribeToTable(table, event, filter, debouncedCallback);
    cleanupRef.current = cleanup;
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [enabled, table, event, filter, debouncedCallback, subscriptionKey]);
  
  // Expose reconnect functionality
  const refresh = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    const cleanup = realtimeService.subscribeToTable(table, event, filter, debouncedCallback);
    cleanupRef.current = cleanup;
  }, [table, event, filter, debouncedCallback]);
  
  return { 
    isConnected,
    refresh
  };
}
