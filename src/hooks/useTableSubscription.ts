
import { useState, useEffect, useRef, useCallback } from 'react';
import { realtimeService } from '@/services/realtime';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';

interface UseTableSubscriptionOptions {
  enabled?: boolean;
  onError?: (error: any) => void;
  onConnectionChange?: (connected: boolean) => void; 
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
  const { enabled = true, onError, onConnectionChange } = options;
  const [isConnected, setIsConnected] = useState(true);
  const callbackRef = useRef(callback);
  const cleanupRef = useRef<(() => void) | null>(null);
  
  // Keep callback reference updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
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
    
    const handlePayload = (payload: any) => {
      try {
        callbackRef.current(payload);
      } catch (error) {
        console.error(`[useTableSubscription] Error processing ${event} event for ${table}:`, error);
        if (onError) onError(error);
      }
    };
    
    // Make sure the service is initialized first
    if (!realtimeService.isInitialized()) {
      realtimeService.init();
    }
    
    // Create subscription through realtime service
    const cleanup = realtimeService.subscribeToTable(table, event, filter, handlePayload);
    cleanupRef.current = cleanup;
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [enabled, table, event, filter, onError]);
  
  // Expose reconnect functionality
  const refresh = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    const cleanup = realtimeService.subscribeToTable(table, event, filter, callbackRef.current);
    cleanupRef.current = cleanup;
  }, [table, event, filter]);
  
  return { 
    isConnected,
    refresh
  };
}
