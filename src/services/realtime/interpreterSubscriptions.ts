
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_INTERPRETER_BADGE_UPDATE } from '@/lib/events';
import { EventDebouncer } from './eventDebouncer';
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
      if (payload?.new && typeof payload.new === 'object') {
        if (payload.new.status) {
          const newStatus = payload.new.status as Profile['status'];
          const oldStatus = payload.old?.status;
          
          // Log all status updates for debugging
          console.log(`[RealtimeService] Status update received for ${interpreterId}: ${oldStatus || 'unknown'} -> ${newStatus}`);
          
          // Call the callback immediately if provided
          if (onStatusChange) {
            console.log(`[RealtimeService] Calling onStatusChange callback for ${interpreterId}`);
            onStatusChange(newStatus);
          }
          
          // Emit both badge update and status update events
          // Badge update is for UI components that display badges
          eventEmitter.emit(EVENT_INTERPRETER_BADGE_UPDATE, {
            interpreterId,
            status: newStatus
          });

          // General status update for any component watching status
          eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
            interpreterId,
            status: newStatus
          });
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
