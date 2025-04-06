
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';
import { EventDebouncer } from './eventDebouncer';
import { SubscriptionStatus, createSubscriptionStatus } from './types';
import { Profile } from '@/types/profile';

/**
 * Creates a subscription to an interpreter's status changes
 */
export function createInterpreterStatusSubscription(
  interpreterId: string,
  eventDebouncer: EventDebouncer,
  onStatusChange?: (status: Profile['status']) => void
): [() => void, string, RealtimeChannel] {
  const key = `interpreter-status-${interpreterId}`;
  
  console.log(`[RealtimeService] Subscribing to interpreter status for ${interpreterId}`);
  
  const channel = supabase.channel(key)
    .on('postgres_changes' as any, {
      event: 'UPDATE',
      schema: 'public',
      table: 'interpreter_profiles',
      filter: `id=eq.${interpreterId}`
    }, (payload) => {
      if (payload.new && payload.new.status) {
        // Avoid duplicate events within cooldown period
        const eventKey = `status-${interpreterId}-${payload.new.status}`;
        const now = Date.now();
        
        if (!eventDebouncer.shouldProcessEvent(eventKey, now)) {
          return;
        }
        
        console.log(`[RealtimeService] Status update for ${interpreterId}: ${payload.new.status}`);
        
        if (onStatusChange) {
          onStatusChange(payload.new.status as Profile['status']);
        }
        
        // Broadcast the event for other components
        eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
          interpreterId,
          status: payload.new.status
        });
      }
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
