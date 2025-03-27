
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { EventDebouncer } from './eventDebouncer';
import { Profile } from '@/types/profile';
import { subscriptionRegistry } from './registry/subscriptionRegistry';

/**
 * Manages all realtime subscriptions
 */
export class SubscriptionManager {
  /**
   * Create a subscription to interpreter status
   */
  public createInterpreterStatusSubscription(
    interpreterId: string,
    eventDebouncer: EventDebouncer
  ): void {
    const key = `interpreter-status-${interpreterId}`;
    const existingStatus = subscriptionRegistry.getStatus(key);
    
    if (existingStatus && existingStatus.channelRef) {
      console.log(`[SubscriptionManager] Found existing subscription for ${key}`);
      return;
    }
    
    try {
      const channel = supabase
        .channel(key)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'interpreter_profiles',
            filter: `id=eq.${interpreterId}`
          },
          (payload) => {
            console.log(`[SubscriptionManager] Received update for interpreter: ${interpreterId}`, payload);
            subscriptionRegistry.updateStatus(key, true);
          }
        )
        .subscribe();
      
      subscriptionRegistry.register(key, channel);
    } catch (error) {
      console.error(`[SubscriptionManager] Error creating interpreter status subscription: ${error}`);
    }
  }
  
  /**
   * Create a subscription to table changes
   */
  public createTableSubscription(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    filter: string | null,
    callback: (payload: any) => void,
    eventDebouncer: EventDebouncer
  ): () => void {
    const filterSuffix = filter ? `-${filter.replace(/[^a-z0-9]/gi, '')}` : '';
    const key = `table-${table}-${event}${filterSuffix}`;
    
    console.log(`[SubscriptionManager] Creating subscription: ${key}`);
    
    try {
      const channel = supabase
        .channel(key)
        .on(
          'postgres_changes',
          {
            event: event,
            schema: 'public',
            table: table,
            filter: filter || undefined
          },
          (payload) => {
            const now = Date.now();
            const eventId = `${table}-${event}-${now}`;
            
            if (eventDebouncer.shouldProcessEvent(eventId, now)) {
              console.log(`[SubscriptionManager] ${event} event on ${table}:`, payload);
              callback(payload);
            }
          }
        )
        .subscribe((status) => {
          console.log(`[SubscriptionManager] Subscription status for ${key}: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            subscriptionRegistry.updateStatus(key, true);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
            subscriptionRegistry.updateStatus(key, false);
          }
        });
      
      subscriptionRegistry.register(key, channel);
      
      return () => {
        console.log(`[SubscriptionManager] Unsubscribing from ${key}`);
        try {
          supabase.removeChannel(channel);
          subscriptionRegistry.unregister(key);
        } catch (error) {
          console.error(`[SubscriptionManager] Error removing channel for ${key}:`, error);
        }
      };
    } catch (error) {
      console.error(`[SubscriptionManager] Error creating table subscription: ${error}`);
      return () => {};
    }
  }
}
