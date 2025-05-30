
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Status of a subscription
 */
export interface SubscriptionStatus {
  connected: boolean;
  retryCount: number;
  lastUpdate: Date;
  channelRef?: RealtimeChannel;
  isActive: boolean;
  maxRetriesReached: boolean;
}

export function createSubscriptionStatus(channel?: RealtimeChannel): SubscriptionStatus {
  return {
    connected: false,
    retryCount: 0,
    lastUpdate: new Date(),
    channelRef: channel,
    isActive: false,
    maxRetriesReached: false,
  };
}
