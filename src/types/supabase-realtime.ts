
// Type definitions for Supabase Realtime API event handlers
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimePayload {
  [key: string]: any;
}

export interface RealtimeContext {
  [key: string]: any;
}

export type RealtimeEventHandler = (payload: RealtimePayload, context?: RealtimeContext) => void;

export interface ChannelStates {
  SUBSCRIBED: 'SUBSCRIBED';
  TIMED_OUT: 'TIMED_OUT';
  CLOSED: 'CLOSED';
  CHANNEL_ERROR: 'CHANNEL_ERROR';
}

export type ChannelState = keyof ChannelStates;

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  state: ChannelState;
  subscribe: (callback?: (state: ChannelState) => void) => Promise<void>;
  unsubscribe: () => Promise<void>;
}
