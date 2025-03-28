
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface EventDebouncerLike {
  debounce: (fn: Function) => void;
}

/**
 * Creates a subscription to database table changes
 */
export function createTableSubscription(
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  filter: string | null,
  callback: (payload: any) => void,
  eventDebouncer: EventDebouncerLike
): [() => void, string, RealtimeChannel] {
  const filterSuffix = filter ? `-${filter.replace(/[^a-z0-9]/gi, '')}` : '';
  const key = `table-${table}-${event}${filterSuffix}`;
  
  console.log(`[RealtimeService] Subscribing to ${table} for ${event} events`);
  
  const channel = supabase.channel(key)
    .on('postgres_changes' as any, {
      event: event,
      schema: 'public',
      table: table,
      filter: filter || undefined
    }, (payload) => {
      // Add timestamp to payload for debugging
      const enhancedPayload = {
        ...payload,
        receivedAt: new Date().toISOString()
      };
      
      console.log(`[RealtimeService] ${event} event on ${table}:`, enhancedPayload);
      eventDebouncer.debounce(() => callback(enhancedPayload));
    })
    .subscribe((status) => {
      console.log(`[RealtimeService] Subscription status for ${key}: ${status}`);
    });
  
  // Return the cleanup function, key, and channel for management
  return [
    () => {
      console.log(`[RealtimeService] Unsubscribing from ${key}`);
      supabase.removeChannel(channel);
    },
    key, 
    channel
  ];
}
