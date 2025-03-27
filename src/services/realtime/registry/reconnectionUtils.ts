
import { supabase } from '@/integrations/supabase/client';
import { RECONNECT_STAGGER_INTERVAL, RECONNECT_STAGGER_MAX_DELAY } from '../constants';
import { SubscriptionStatus } from './types';

/**
 * Handle staggered reconnection for a list of subscriptions
 */
export function handleStaggeredReconnection(
  subscriptionStatuses: Record<string, SubscriptionStatus>,
  updateStatus: (key: string, connected: boolean) => void
): void {
  const keys = Object.keys(subscriptionStatuses);
  
  if (keys.length === 0) {
    console.log('[RealtimeService] No subscriptions to reconnect');
    return;
  }
  
  console.log(`[RealtimeService] Attempting to reconnect ${keys.length} subscriptions with staggered timing`);
  
  // First, mark all subscriptions as disconnected
  keys.forEach(key => {
    updateStatus(key, false);
  });
  
  // Then reconnect with staggered timing to avoid overwhelming the server
  let reconnectedCount = 0;
  
  keys.forEach((key, index) => {
    const status = subscriptionStatuses[key];
    const delay = Math.min(
      index * RECONNECT_STAGGER_INTERVAL, 
      RECONNECT_STAGGER_MAX_DELAY
    );
    
    setTimeout(() => {
      if (status && status.channelRef) {
        try {
          console.log(`[RealtimeService] Reconnecting ${key}`);
          
          // Check if channel is in a state that needs reconnection
          if (status.channelRef.state !== 'joined') {
            // Just attempt to reconnect first
            status.channelRef.subscribe((status) => {
              console.log(`[RealtimeService] Resubscription status for ${key}: ${status}`);
              // Fixed: Check if status is 'SUBSCRIBED' instead of accessing channelRef property
              if (status === 'SUBSCRIBED') {
                updateStatus(key, true);
              }
            });
          } else {
            console.log(`[RealtimeService] Channel ${key} is already joined, skipping reconnection`);
            updateStatus(key, true);
          }
        } catch (error) {
          console.error(`[RealtimeService] Error reconnecting ${key}:`, error);
        }
      }
      
      reconnectedCount++;
    }, delay);
  });
}
