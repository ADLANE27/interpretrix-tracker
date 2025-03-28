
import { useState, useEffect, useRef } from 'react';
import { realtimeService } from '@/services/realtime';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';

interface UseTableSubscriptionOptions {
  enabled?: boolean;
  onError?: (error: any) => void;
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
  const { enabled = true, onError } = options;
  const [isConnected, setIsConnected] = useState(true);
  const callbackRef = useRef(callback);
  
  // Keep callback reference updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Initialize the realtime service once
  useEffect(() => {
    const cleanup = realtimeService.init();
    return cleanup;
  }, []);
  
  // Subscribe to the table
  useEffect(() => {
    if (!enabled) return;
    
    const handlePayload = (payload: any) => {
      try {
        callbackRef.current(payload);
      } catch (error) {
        console.error(`Error processing ${event} event for ${table}:`, error);
        if (onError) onError(error);
      }
    };
    
    const cleanup = realtimeService.subscribeToTable(table, event, filter, handlePayload);
    
    return cleanup;
  }, [enabled, table, event, filter, onError]);
  
  // Track connection status
  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    };
  }, []);
  
  return { isConnected };
}
