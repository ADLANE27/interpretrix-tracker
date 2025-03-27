import { useEffect, useRef } from 'react';
import { 
  subscribeToTable, 
  SubscriptionConfig, 
  SubscriptionOptions 
} from '@/lib/realtimeManager';

/**
 * Custom hook for subscribing to Supabase real-time changes
 * using the centralized subscription manager.
 */
export function useRealtimeSubscription2(
  config: SubscriptionConfig,
  callback: (payload: any) => void,
  options: SubscriptionOptions = {}
) {
  const { enabled = true } = options;
  const callbackRef = useRef(callback);
  
  // Keep the callback reference up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Set up the subscription
  useEffect(() => {
    if (!enabled) return;
    
    const wrappedCallback = (payload: any) => {
      callbackRef.current(payload);
    };
    
    // Subscribe and get cleanup function
    const cleanup = subscribeToTable(
      config,
      wrappedCallback,
      options
    );
    
    // Cleanup function will unsubscribe when component unmounts
    return cleanup;
  }, [
    enabled,
    config.table,
    config.event,
    config.schema,
    config.filter,
    options.debounceTime,
    options.enableTable,
    options.channelNameOverride
  ]);
}

// Export for backward compatibility
export const useRealtimeSubscription = useRealtimeSubscription2;
