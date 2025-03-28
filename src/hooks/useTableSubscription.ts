import { useState, useEffect, useRef, useCallback } from 'react';
import { realtimeService } from '@/services/realtime';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';

interface UseTableSubscriptionOptions {
  enabled?: boolean;
  onError?: (error: any) => void;
  onConnectionChange?: (connected: boolean) => void;
  retry?: number;
  retryInterval?: number;
  debugMode?: boolean;
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
  const { 
    enabled = true, 
    onError, 
    onConnectionChange, 
    retry = 3,
    retryInterval = 5000,
    debugMode = false
  } = options;
  
  const [isConnected, setIsConnected] = useState(true);
  const callbackRef = useRef(callback);
  const cleanupRef = useRef<(() => void) | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionKey = useRef(`table-${table}-${event}${filter ? `-${filter}` : ''}`);
  const instanceId = useRef(`instance-${Math.random().toString(36).substring(2, 9)}`);
  
  // Keep callback reference updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Listen for connection status changes
  useEffect(() => {
    const handleConnectionStatusChange = (connected: boolean) => {
      if (connected !== isConnected) {
        setIsConnected(connected);
        
        if (onConnectionChange) {
          onConnectionChange(connected);
        }
        
        if (connected && retryCountRef.current > 0) {
          // Reset retry count on connection restore
          retryCountRef.current = 0;
          
          // Try to re-subscribe
          setupSubscription();
        }
      }
    };
    
    const handlerKey = `connection-${subscriptionKey.current}-${instanceId.current}`;
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatusChange, handlerKey);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatusChange, handlerKey);
    };
  }, [isConnected, onConnectionChange]);
  
  // Set up subscription with retry logic
  const setupSubscription = useCallback(() => {
    if (!enabled) return;
    
    if (debugMode) {
      console.log(`[useTableSubscription] Setting up subscription for ${table}.${event}`);
    }
    
    try {
      // Clean up any existing subscription
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      
      // Create new subscription
      const wrappedCallback = (payload: any) => {
        try {
          callbackRef.current(payload);
        } catch (error) {
          console.error(`[useTableSubscription] Error in callback for ${table}.${event}:`, error);
          if (onError) onError(error);
        }
      };
      
      const cleanup = realtimeService.subscribeToTable(
        table,
        event,
        filter,
        wrappedCallback
      );
      
      cleanupRef.current = cleanup;
    } catch (error) {
      console.error(`[useTableSubscription] Error subscribing to ${table}.${event}:`, error);
      
      if (onError) {
        onError(error);
      }
      
      // Retry logic
      if (retryCountRef.current < retry) {
        retryCountRef.current++;
        
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
        
        // Exponential backoff
        const delay = retryInterval * Math.pow(1.5, retryCountRef.current - 1);
        
        if (debugMode) {
          console.log(`[useTableSubscription] Retry ${retryCountRef.current}/${retry} in ${delay}ms for ${table}.${event}`);
        }
        
        retryTimerRef.current = setTimeout(() => {
          setupSubscription();
        }, delay);
      }
    }
  }, [table, event, filter, enabled, retry, retryInterval, onError, debugMode]);
  
  // Set up subscription on mount and when dependencies change
  useEffect(() => {
    // Reset retry count when dependencies change
    retryCountRef.current = 0;
    
    // Set up subscription
    setupSubscription();
    
    // Cleanup function
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [setupSubscription, table, event, filter, enabled]);
  
  return {
    isConnected,
    retryCount: retryCountRef.current,
    resubscribe: setupSubscription
  };
}
