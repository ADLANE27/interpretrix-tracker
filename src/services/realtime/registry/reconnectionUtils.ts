
import { SubscriptionStatus } from './types';

/**
 * Handle staggered reconnection of subscriptions
 */
export function handleStaggeredReconnection(
  subscriptionStatuses: Record<string, SubscriptionStatus>,
  updateStatus: (key: string, connected: boolean) => void
): void {
  const statusEntries = Object.entries(subscriptionStatuses);
  
  if (statusEntries.length === 0) {
    console.log('[RealtimeService] No subscriptions to reconnect');
    return;
  }
  
  console.log(`[RealtimeService] Reconnecting ${statusEntries.length} subscriptions with staggered timing`);
  
  // Reconnect subscriptions with staggering
  statusEntries.forEach(([key, status], index) => {
    const delay = Math.min(index * 500, 5000); // Max 5 second delay
    
    // Temporarily mark as disconnected
    updateStatus(key, false);
    
    setTimeout(() => {
      console.log(`[RealtimeService] Reconnecting subscription: ${key}`);
      // Let the listener know we're trying to reconnect
      updateStatus(key, true);
    }, delay);
  });
}
