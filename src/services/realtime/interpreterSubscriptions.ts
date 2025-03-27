
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
  
  console.log(`[RealtimeService] ⭐ Creating NEW status subscription for ${interpreterId}`);
  
  const channel = supabase.channel(key)
    .on('postgres_changes' as any, {
      event: 'UPDATE',
      schema: 'public',
      table: 'interpreter_profiles',
      filter: `id=eq.${interpreterId}`
    }, (payload: any) => {
      // Safety check for payload properties
      if (payload?.new && typeof payload.new === 'object') {
        if ('status' in payload.new) {
          const newStatus = payload.new.status as Profile['status'];
          const oldStatus = payload.old?.status;
          
          // Always log updates for debugging
          console.log(`[RealtimeService] ⚡ STATUS UPDATE RECEIVED for ${interpreterId}: ${oldStatus || 'unknown'} -> ${newStatus}`);
          
          // Call the callback immediately if provided
          if (onStatusChange) {
            console.log(`[RealtimeService] 📱 Calling onStatusChange callback for ${interpreterId} with status ${newStatus}`);
            onStatusChange(newStatus);
          }
          
          // CRITICAL: First emit badge update IMMEDIATELY for UI components
          console.log(`[RealtimeService] 🔴 Emitting BADGE_UPDATE event for ${interpreterId} with ${newStatus}`);
          eventEmitter.emit(EVENT_INTERPRETER_BADGE_UPDATE, {
            interpreterId,
            status: newStatus
          });

          // Then emit general status update (also immediately - no delay)
          console.log(`[RealtimeService] 🔄 Emitting STATUS_UPDATE event for ${interpreterId} with ${newStatus}`);
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
