import { useEffect, useRef } from 'react';
import { realtimeService } from '@/services/realtime';

interface PostgresChangesConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string | null;
}

interface SubscriptionOptions {
  debugMode?: boolean;
  maxRetries?: number;
  retryInterval?: number;
  onError?: (error: any) => void;
}

/**
 * Hook to subscribe to Supabase Realtime changes
 * 
 * @param config PostgresChangesConfig object
 * @param callback Function to call when a change is detected
 * @param options Subscription options
 */
export const useRealtimeSubscription = (
  config: PostgresChangesConfig,
  callback: (payload: any) => void,
  options: SubscriptionOptions = {}
) => {
  const {
    debugMode = false,
    maxRetries = 3,
    retryInterval = 3000,
    onError = (error: any) => {
      console.error('[useRealtimeSubscription] Error:', error);
    }
  } = options;

  // Keep a reference to the callback to avoid unnecessary re-subscriptions
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // Keep track of the subscription
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const setupSubscription = () => {
      if (debugMode) {
        console.log('[useRealtimeSubscription] Setting up subscription:', config);
      }

      try {
        // Cleanup any existing subscription
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        // Create the subscription
        const unsubscribe = realtimeService.subscribeToTable(
          config.table,
          config.event,
          config.filter || null,
          (payload) => {
            if (debugMode) {
              console.log(`[useRealtimeSubscription] Received ${config.event} in ${config.table}:`, payload);
            }
            callbackRef.current(payload);
          }
        );

        // Store the unsubscribe function
        unsubscribeRef.current = unsubscribe;

        // Reset retry count on successful subscription
        retryCountRef.current = 0;

        return unsubscribe;
      } catch (error) {
        console.error('[useRealtimeSubscription] Error setting up subscription:', error);
        onError(error);
        
        // Retry setup if under max retries
        if (retryCountRef.current < maxRetries) {
          if (debugMode) {
            console.log(`[useRealtimeSubscription] Retrying in ${retryInterval}ms (${retryCountRef.current + 1}/${maxRetries})`);
          }
          
          // Clear any existing timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          
          // Set retry timeout
          retryTimeoutRef.current = setTimeout(() => {
            retryCountRef.current++;
            setupSubscription();
          }, retryInterval);
        }
        
        return () => {};
      }
    };

    // Initial setup
    const unsubscribe = setupSubscription();

    // Cleanup on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      } else if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [
    config.event, 
    config.table, 
    config.filter, 
    config.schema,
    debugMode,
    maxRetries,
    retryInterval,
    onError
  ]);
};
