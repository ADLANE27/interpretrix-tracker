
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';
import { EventDebouncer } from './eventDebouncer';
import { SubscriptionStatus, createSubscriptionStatus } from './types';
import { Profile } from '@/types/profile';
import { STATUS_UPDATE_DEBOUNCE } from './constants';

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
    }, (payload: any) => {
      // Safety check for payload properties
      if (payload?.new?.status) {
        // Skip debounce for status updates - process immediately
        const newStatus = payload.new.status as Profile['status'];
        const oldStatus = payload.old?.status;
        
        if (oldStatus && newStatus !== oldStatus) {
          console.log(`[RealtimeService] Status change for ${interpreterId}: ${oldStatus} -> ${newStatus}`);
          
          // Call the callback immediately if provided
          if (onStatusChange) {
            onStatusChange(newStatus);
          }
          
          // Broadcast the event for other components immediately
          eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
            interpreterId,
            status: newStatus
          });
        } else {
          // Only log status refresh if it's the same value
          console.log(`[RealtimeService] Status refresh for ${interpreterId}: ${newStatus}`);
          
          // Still call the callback for non-changes (e.g. initial syncs)
          if (onStatusChange) {
            onStatusChange(newStatus);
          }
        }
      }
    })
    .subscribe((status: string) => {
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
