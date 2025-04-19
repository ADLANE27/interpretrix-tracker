
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { EventDebouncer } from './eventDebouncer';
import { Profile } from '@/types/profile';

// Cache for active interpreter subscriptions to prevent duplicates
const activeInterpreterSubscriptions = new Map<string, { count: number, channel: RealtimeChannel }>();

/**
 * Creates a subscription to interpreter status changes
 */
export function createInterpreterStatusSubscription(
  interpreterId: string,
  eventDebouncer: EventDebouncer,
  callback: (newStatus: Profile['status']) => void
): [() => void, string, RealtimeChannel] {
  const key = `interpreter-status-${interpreterId}`;

  // Check if we already have an active subscription
  if (activeInterpreterSubscriptions.has(key)) {
    const existing = activeInterpreterSubscriptions.get(key)!;
    existing.count++;
    
    console.log(`[RealtimeService] Reusing interpreter subscription: ${key}, count: ${existing.count}`);
    
    return [
      () => {
        const current = activeInterpreterSubscriptions.get(key);
        if (current) {
          current.count--;
          if (current.count <= 0) {
            console.log(`[RealtimeService] Removing interpreter subscription: ${key}`);
            supabase.removeChannel(current.channel);
            activeInterpreterSubscriptions.delete(key);
          }
        }
      },
      key,
      existing.channel
    ];
  }

  console.log(`[RealtimeService] Creating new interpreter subscription: ${key}`);
  
  const channel = supabase.channel(key)
    .on(
      'postgres_changes' as any,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'interpreter_profiles',
        filter: `id=eq.${interpreterId}`
      },
      (payload) => {
        const eventId = `interpreter-status-${interpreterId}-${Date.now()}`;
        
        if (eventDebouncer.shouldProcessEvent(eventId)) {
          const newStatus = payload.new?.status as Profile['status'];
          callback(newStatus);
        }
      }
    )
    .subscribe();
  
  // Cache the subscription
  activeInterpreterSubscriptions.set(key, { count: 1, channel });
  
  return [
    () => {
      const current = activeInterpreterSubscriptions.get(key);
      if (current) {
        current.count--;
        if (current.count <= 0) {
          console.log(`[RealtimeService] Removing interpreter subscription: ${key}`);
          supabase.removeChannel(current.channel);
          activeInterpreterSubscriptions.delete(key);
        }
      }
    }, 
    key, 
    channel
  ];
}
