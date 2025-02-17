
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
}

interface UseRealtimeSubscriptionOptions {
  enabled?: boolean;
  retryInterval?: number;
  maxRetries?: number;
  onError?: (error: any) => void;
}

export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: any) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  const {
    enabled = true,
    retryInterval = 5000,
    maxRetries = 3,
    onError
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const setupChannel = () => {
      if (!enabled) return;

      try {
        // Clean up existing channel if any
        if (channelRef.current) {
          console.log('[Realtime] Removing existing channel');
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        console.log('[Realtime] Setting up new channel for:', config.table);
        
        channelRef.current = supabase
          .channel(`realtime_${config.table}`)
          .on(
            'postgres_changes',
            {
              event: config.event,
              schema: config.schema || 'public',
              table: config.table,
              filter: config.filter,
            },
            (payload) => {
              console.log(`[Realtime] Received ${config.event} event for ${config.table}:`, payload);
              callback(payload);
            }
          )
          .subscribe(async (status) => {
            console.log(`[Realtime] Subscription status for ${config.table}:`, status);
            
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              retryCountRef.current = 0;
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setIsConnected(false);
              
              if (retryCountRef.current < maxRetries) {
                console.log(`[Realtime] Attempting reconnection for ${config.table}`);
                retryCountRef.current++;
                timeoutId = setTimeout(setupChannel, retryInterval);
              } else {
                console.error(`[Realtime] Max retries reached for ${config.table}`);
                onError?.({
                  message: `Failed to establish realtime connection for ${config.table} after ${maxRetries} attempts`
                });
              }
            }
          });

      } catch (error) {
        console.error(`[Realtime] Error setting up channel for ${config.table}:`, error);
        onError?.(error);
      }
    };

    setupChannel();

    // Cleanup function
    return () => {
      console.log(`[Realtime] Cleaning up subscription for ${config.table}`);
      clearTimeout(timeoutId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled, config.table, config.event, config.schema, config.filter]);

  return { isConnected };
}
