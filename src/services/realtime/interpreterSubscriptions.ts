
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';
import { EventDebouncer } from './eventDebouncer';

export function createInterpreterStatusSubscription(
  interpreterId: string,
  eventDebouncer: EventDebouncer,
  onStatusChange: (status: Profile['status']) => void
): [() => void, string, any] {
  try {
    if (!interpreterId) {
      throw new Error('Interpreter ID is required');
    }
    
    const key = `interpreter-status-${interpreterId}`;
    
    console.log(`[InterpreterSubscription] Creating subscription for ${interpreterId}`);
    
    const channel = supabase.channel(`interpreter-status-${interpreterId}-${Date.now()}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interpreter_profiles',
          filter: `id=eq.${interpreterId}`
        },
        (payload) => {
          console.log(`[InterpreterSubscription] Status update for ${interpreterId}:`, payload);
          
          if (!payload.new || !payload.old) return;
          
          // Only process if status actually changed
          if (payload.new.status !== payload.old.status) {
            const eventId = `status-${interpreterId}-${Date.now()}`;
            const now = Date.now();
            
            if (eventDebouncer.shouldProcessEvent(eventId, now)) {
              console.log(`[InterpreterSubscription] Processing status change for ${interpreterId}: ${payload.new.status}`);
              onStatusChange(payload.new.status as Profile['status']);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[InterpreterSubscription] Subscription status for ${interpreterId}: ${status}`);
      });
      
    // Return cleanup function
    return [
      () => {
        console.log(`[InterpreterSubscription] Cleaning up subscription for ${interpreterId}`);
        supabase.removeChannel(channel);
      },
      key,
      channel
    ];
  } catch (error) {
    console.error(`[InterpreterSubscription] Error creating subscription:`, error);
    return [() => {}, '', null];
  }
}
