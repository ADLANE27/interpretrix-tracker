
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SubscriptionStatus {
  connected: boolean;
  retryCount: number;
  lastUpdate: Date;
  channelRef?: RealtimeChannel;
}

export function createSubscriptionStatus(channel?: RealtimeChannel): SubscriptionStatus {
  return {
    connected: false,
    retryCount: 0,
    lastUpdate: new Date(),
    channelRef: channel
  };
}
