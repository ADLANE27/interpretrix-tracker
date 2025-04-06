
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, shouldProcessEvent } from '@/lib/events';
import { EventDebouncer } from './eventDebouncer';
import { SubscriptionStatus, createSubscriptionStatus } from './types';
import { Profile } from '@/types/profile';
import { v4 as uuidv4 } from 'uuid';

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
        
        if (!eventDebouncer.shouldProcessEvent(eventKey, now, payload.new.status)) {
          console.log(`[RealtimeService] Deduplicated status update for ${interpreterId}`);
          return;
        }
        
        // Generate a unique ID for this update to prevent duplicate processing
        const uuid = uuidv4();
        
        // Check if this event should be processed
        if (!shouldProcessEvent(interpreterId, EVENT_INTERPRETER_STATUS_UPDATE, payload.new.status, uuid, 'supabase-db')) {
          console.log(`[RealtimeService] Skipping processed status update for ${interpreterId}`);
          return;
        }
        
        console.log(`[RealtimeService] Status update from DB for ${interpreterId}: ${payload.new.status}`);
        
        if (onStatusChange) {
          onStatusChange(payload.new.status as Profile['status']);
        }
        
        // Broadcast the event for other components
        // Add source identifier to track origin of this update
        eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
          interpreterId,
          status: payload.new.status,
          timestamp: now,
          uuid,
          source: `supabase-subscription-${interpreterId}`,
          fromDb: true
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
