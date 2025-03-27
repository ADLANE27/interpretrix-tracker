
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { EventDebouncer } from './eventDebouncer';
import { Profile } from '@/types/profile';
import { subscriptionRegistry } from './registry/subscriptionRegistry';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';

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
          'postgres_changes' as any,
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'interpreter_profiles',
            filter: `id=eq.${interpreterId}`
          },
          (payload) => {
            console.log(`[SubscriptionManager] Received update for interpreter: ${interpreterId}`, payload);
            
            // Direct status update broadcasting without debounce
            if (payload.new && payload.old && payload.new.status !== payload.old.status) {
              const newStatus = payload.new.status as Profile['status'];
              console.log(`[SubscriptionManager] Interpreter status changed from ${payload.old.status} to ${newStatus}`);
              
              // Immediately emit the status update event for faster UI updates
              eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
                interpreterId: interpreterId,
                status: newStatus
              });
            }
            
            subscriptionRegistry.updateStatus(key, true);
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
          'postgres_changes' as any,
          {
            event: event,
            schema: 'public',
            table: table,
            filter: filter || undefined
          },
          (payload) => {
            const now = Date.now();
            const eventId = `${table}-${event}-${now}`;
            
            // Skip debounce for status-related updates
            const isStatusUpdate = 
              table === 'interpreter_profiles' && 
              payload.new && 
              payload.old && 
              payload.new.status !== payload.old.status;
            
            if (isStatusUpdate || eventDebouncer.shouldProcessEvent(eventId, now)) {
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
