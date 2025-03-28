
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
  event: RealtimeEvent;
  schema?: string;
  table: string;
  filter?: string;
}

interface SubscriptionOptions {
  debugMode?: boolean;
  maxRetries?: number;
  retryInterval?: number;
  onError?: (error: Error) => void;
}

/**
 * Hook for subscribing to realtime changes from Supabase
 */
export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: any) => void,
  options: SubscriptionOptions = {}
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    debugMode = false,
    maxRetries = 5,
    retryInterval = 3000,
    onError
  } = options;
  
  useEffect(() => {
    let isMounted = true;
    
    const setupChannel = () => {
      if (!isMounted) return null;
      
      // Clean up previous subscription if it exists
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          if (debugMode) console.error('[useRealtimeSubscription] Error removing channel:', error);
        }
        channelRef.current = null;
      }
      
      try {
        // Create unique channel name based on table and timestamp
        const channelName = `${config.table}-changes-${Date.now()}`;
        if (debugMode) console.log(`[useRealtimeSubscription] Setting up channel: ${channelName}`);
        
        channelRef.current = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: config.event,
              schema: config.schema || 'public',
              table: config.table,
              filter: config.filter
            },
            (payload) => {
              if (debugMode) console.log(`[useRealtimeSubscription] Received ${config.event} for ${config.table}:`, payload);
              callback(payload);
            }
          )
          .subscribe((status) => {
            if (debugMode) console.log(`[useRealtimeSubscription] Channel ${channelName} status:`, status);
            
            if (status === 'SUBSCRIBED') {
              // Reset retry count on successful subscription
              retryCountRef.current = 0;
              if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              // Handle channel errors with retry logic
              if (isMounted && retryCountRef.current < maxRetries) {
                if (debugMode) {
                  console.error(`[useRealtimeSubscription] Channel error: ${status}, retrying (${retryCountRef.current + 1}/${maxRetries})`);
                }
                
                if (onError) onError(new Error(`Realtime subscription issue. Status: ${status}`));
                
                // Clear previous retry timer
                if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
                
                // Set up retry with exponential backoff
                const delay = retryInterval * Math.pow(1.5, retryCountRef.current);
                retryTimerRef.current = setTimeout(() => {
                  retryCountRef.current += 1;
                  if (isMounted) setupChannel();
                }, delay);
              } else if (isMounted) {
                const error = new Error(`[useMissionUpdates] Realtime subscription issue. Will auto-retry.`);
                if (onError) onError(error);
                console.error(error);
              }
            }
          });
          
        return channelRef.current;
      } catch (error) {
        console.error('[useRealtimeSubscription] Error setting up subscription:', error);
        if (onError) onError(error as Error);
        return null;
      }
    };
    
    setupChannel();
    
    // Cleanup function
    return () => {
      isMounted = false;
      
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          if (debugMode) console.error('[useRealtimeSubscription] Error cleaning up channel:', error);
        }
        channelRef.current = null;
      }
    };
  }, [config.event, config.schema, config.table, config.filter, callback, debugMode, maxRetries, retryInterval, onError]);
  
  // Return a function to manually reconnect if needed
  return {
    reconnect: () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      
      retryCountRef.current = 0;
      return setupChannel();
    }
  };
}
