
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

  useEffect(() => {
    if (!enabled) return;
    
    let channel = supabase.channel('custom-realtime-channel');
    
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
          callbackRef.current(payload);
        }
      );
    });
    
    // Subscribe to the channel
    const subscription = channel.subscribe();
    channelRef.current = channel;
    
    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, [optionsArray, enabled]);

  return channelRef.current;
}
