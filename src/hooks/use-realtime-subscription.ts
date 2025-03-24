
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type SupabaseEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
  event: SupabaseEvent;
  schema?: string;
  table: string;
  filter?: string;
}

interface HookOptions {
  enabled?: boolean;
  debugMode?: boolean;
  maxRetries?: number;
  retryInterval?: number;
  onError?: (error: Error) => void;
}

export const useRealtimeSubscription = <T = any>(
  config: SubscriptionConfig,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
  options: HookOptions = {}
) => {
  const {
    enabled = true,
    debugMode = false,
    maxRetries = 3,
    retryInterval = 2000,
    onError
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const configRef = useRef(config);
  const [isConnected, setIsConnected] = useState(false);
  const lastPayloadRef = useRef<RealtimePostgresChangesPayload<T> | null>(null);

  // Update refs when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Channel setup function
  const setupChannel = () => {
    if (!enabled) return;

    // Clean up any existing channel
    if (channelRef.current) {
      if (debugMode) console.log('[useRealtimeSubscription] Removing existing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const { event, schema = 'public', table, filter } = configRef.current;

    if (debugMode) {
      console.log(`[useRealtimeSubscription] Setting up subscription: ${event} on ${table} with filter ${filter || 'none'}`);
    }

    // Generate a unique channel name with timestamp
    const channelName = `${table}-${event}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      // Create the subscription config
      const subscriptionConfig: any = {
        event,
        schema,
        table
      };

      // Add filter if provided - careful with proper filter syntax
      if (filter) {
        subscriptionConfig.filter = filter;
      }

      // Create and set up the channel
      channelRef.current = supabase.channel(channelName)
        .on('postgres_changes', subscriptionConfig, (payload: RealtimePostgresChangesPayload<T>) => {
          if (debugMode) {
            console.log(`[useRealtimeSubscription] Received ${event} on ${table}:`, payload);
          }
          
          // Save the last payload for reconnection
          lastPayloadRef.current = payload;
          
          // Call the callback with the payload
          callbackRef.current(payload);
        })
        .on('system', { event: 'reconnect' }, (event) => {
          if (debugMode) {
            console.log('[useRealtimeSubscription] System reconnect event:', event);
          }
          setIsConnected(true);
          retryCountRef.current = 0;
        })
        .on('system', { event: 'connected' }, () => {
          if (debugMode) {
            console.log('[useRealtimeSubscription] Connected to Realtime');
          }
          setIsConnected(true);
          retryCountRef.current = 0;
        })
        .on('system', { event: 'disconnected' }, () => {
          if (debugMode) {
            console.log('[useRealtimeSubscription] Disconnected from Realtime');
          }
          setIsConnected(false);
        })
        .on('system', { event: 'error' }, (err) => {
          console.error(`[useRealtimeSubscription] Error on ${table}:`, err);
          setIsConnected(false);
          
          if (onError) {
            onError(new Error(`Realtime error: ${JSON.stringify(err)}`));
          }
        })
        .subscribe(async (status) => {
          if (debugMode) {
            console.log(`[useRealtimeSubscription] Subscription status for ${table}:`, status);
          }

          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            retryCountRef.current = 0;
          } else if (status === 'SUBSCRIPTION_ERROR' || status === 'CHANNEL_ERROR') {
            console.error(`[useRealtimeSubscription] Subscription error for ${table}`);
            setIsConnected(false);
            
            // Handle retry logic
            retryCountRef.current++;
            
            if (retryCountRef.current <= maxRetries) {
              const delay = retryInterval * Math.pow(1.5, retryCountRef.current - 1);
              console.log(`[useRealtimeSubscription] Retry attempt ${retryCountRef.current} in ${delay}ms`);
              
              // Set up reconnect timeout
              reconnectTimeoutRef.current = setTimeout(() => {
                if (debugMode) {
                  console.log(`[useRealtimeSubscription] Reconnecting to ${table}...`);
                }
                setupChannel();
              }, delay);
            } else {
              console.error(`[useRealtimeSubscription] Max retries reached for ${table}`);
              
              if (onError) {
                onError(new Error(`Max reconnection attempts reached for ${table}`));
              }
            }
          }
        });

      return () => {
        if (channelRef.current) {
          if (debugMode) {
            console.log('[useRealtimeSubscription] Cleaning up channel');
          }
          supabase.removeChannel(channelRef.current);
        }
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };
    } catch (error) {
      console.error('[useRealtimeSubscription] Error setting up channel:', error);
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  // Set up the subscription when the hook mounts or options change
  useEffect(() => {
    return setupChannel();
  }, [enabled]);

  return {
    isConnected,
    lastPayload: lastPayloadRef.current
  };
};
