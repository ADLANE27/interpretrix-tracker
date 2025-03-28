
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Status of a subscription
 */
export interface SubscriptionStatus {
  connected: boolean;
  retryCount: number;
  lastUpdate: Date;
  channelRef?: RealtimeChannel;
  isActive: boolean;  // Required property
  maxRetriesReached?: boolean; // Added missing property
}

export function createSubscriptionStatus(channel?: RealtimeChannel): SubscriptionStatus {
  return {
    connected: false,
    retryCount: 0,
    lastUpdate: new Date(),
    channelRef: channel,
    isActive: false,
    maxRetriesReached: false, // Initialize the new property
  };
}
