
import { useEffect, useRef, useCallback } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionOptions {
  event: PostgresEvent;
  schema?: string;
  table: string;
  filter?: string;
}

export function useRealtimeSubscription2(
  options: SubscriptionOptions | SubscriptionOptions[],
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  enabled: boolean = true
) {
  const optionsArray = Array.isArray(options) ? options : [options];
  const callbackRef = useRef(callback);
  const channelRef = useRef<any>(null);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Memoize the channel setup to prevent recreating on each render
  const setupChannel = useCallback(() => {
    if (!enabled) return null;
    
    let channel = supabase.channel('custom-realtime-channel');
    
    // Add all subscriptions to the channel
    optionsArray.forEach(opt => {
      channel = channel.on(
        'postgres_changes' as any, 
        {
          event: opt.event,
          schema: opt.schema || 'public',
          table: opt.table,
          filter: opt.filter
        } as any,
        (payload: any) => {
          callbackRef.current(payload);
        }
      );
    });
    
    return channel;
  }, [enabled, optionsArray]);

  useEffect(() => {
    if (!enabled) return;
    
    const channel = setupChannel();
    if (!channel) return;
    
    // Subscribe to the channel
    const subscription = channel.subscribe();
    channelRef.current = channel;
    
    // Cleanup function
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [enabled, setupChannel]);

  return channelRef.current;
}
