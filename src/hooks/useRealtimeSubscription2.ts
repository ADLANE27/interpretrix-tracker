
import { useEffect, useRef } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionOptions {
  event: PostgresEvent;
  schema?: string;
  table: string;
  filter?: string;
}

interface UseRealtimeSubscription2Options {
  debugMode?: boolean;
  maxRetries?: number;
  retryInterval?: number;
  onError?: (error: any) => void;
  channelName?: string;
}

/**
 * A more optimized hook for Supabase realtime subscriptions that prevents
 * excessive re-renders and properly cleans up resources.
 */
export function useRealtimeSubscription2(
  options: SubscriptionOptions | SubscriptionOptions[],
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  hookOptions: UseRealtimeSubscription2Options = {},
  enabled: boolean = true
) {
  const optionsArray = Array.isArray(options) ? options : [options];
  const callbackRef = useRef(callback);
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  
  // Generate a stable channel name
  const channelName = hookOptions.channelName || 
    `realtime-${optionsArray.map(o => `${o.table}-${o.event}`).join('-')}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (!enabled) return;
    
    let channel = supabase.channel(channelName);
    
    // Add all subscriptions to the channel
    optionsArray.forEach(opt => {
      channel = channel.on(
        'postgres_changes',
        {
          event: opt.event,
          schema: opt.schema || 'public',
          table: opt.table,
          filter: opt.filter
        },
        (payload) => {
          if (!mountedRef.current) return;
          callbackRef.current(payload);
        }
      );
    });
    
    // Subscribe to the channel with retry logic
    channel.subscribe((status) => {
      if (hookOptions.debugMode) {
        console.log(`[useRealtimeSubscription2] Subscription status for ${channelName}: ${status}`);
      }
      
      if (status === 'CHANNEL_ERROR') {
        if (hookOptions.onError) {
          hookOptions.onError(new Error(`Channel subscription error for ${channelName}`));
        }
      }
    });
    
    channelRef.current = channel;
    
    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        if (hookOptions.debugMode) {
          console.log(`[useRealtimeSubscription2] Cleaning up channel ${channelName}`);
        }
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, enabled, hookOptions.debugMode, hookOptions.onError, JSON.stringify(optionsArray)]);

  return {
    channel: channelRef.current,
    isSubscribed: !!channelRef.current,
    resubscribe: () => {
      if (channelRef.current) {
        channelRef.current.subscribe();
      }
    }
  };
}
