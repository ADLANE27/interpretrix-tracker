
// This file re-exports from the new modular structure for backward compatibility
import { useRealtimeSubscription } from './realtime/useRealtimeSubscription';
import type { 
  SubscriptionConfig, 
  UseRealtimeSubscriptionOptions,
  RealtimeSubscriptionReturn 
} from './realtime/types';

export { useRealtimeSubscription };
export type { SubscriptionConfig, UseRealtimeSubscriptionOptions, RealtimeSubscriptionReturn };
