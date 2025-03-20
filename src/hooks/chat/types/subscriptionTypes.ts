
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SubscriptionState {
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR',
  error?: Error
}

export interface SubscriptionStates {
  messages?: SubscriptionState;
  mentions?: SubscriptionState;
}

export interface ExtendedPayload {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old?: Record<string, any>;
  errors: string | null;
  receivedAt?: number;
}

export interface UseSubscriptionsReturn {
  subscriptionStates: SubscriptionStates;
  handleSubscriptionError: (error: Error, type: 'messages' | 'mentions') => void;
  isSubscribed: boolean;
  lastEventTimestamp: number;
}
