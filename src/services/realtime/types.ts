
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SubscriptionStatus {
  connected: boolean;
  lastUpdate: Date;
  retryCount: number;
  channelRef: RealtimeChannel | null;
}

export function createSubscriptionStatus(channel?: RealtimeChannel | null): SubscriptionStatus {
  return {
    connected: false,
    lastUpdate: new Date(),
    retryCount: 0,
    channelRef: channel || null
  };
}
