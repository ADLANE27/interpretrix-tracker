
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Status of a subscription
 */
export interface SubscriptionStatus {
  connected: boolean;
  isActive: boolean;
  retryCount: number;
  maxRetriesReached: boolean;
  lastUpdate: Date;
  channelRef?: RealtimeChannel;
}

/**
 * Creates a new subscription status
 */
export function createSubscriptionStatus(channel?: RealtimeChannel): SubscriptionStatus {
  return {
    connected: false,
    isActive: true,
    retryCount: 0,
    maxRetriesReached: false,
    lastUpdate: new Date(),
    channelRef: channel
  };
}
