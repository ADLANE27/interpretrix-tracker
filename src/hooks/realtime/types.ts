
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SubscriptionConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
}

export interface UseRealtimeSubscriptionOptions {
  enabled?: boolean;
  retryInterval?: number;
  maxRetries?: number;
  onError?: (error: any) => void;
  debugMode?: boolean;
  enableRealtimeConfig?: boolean;
}

export interface RealtimeSubscriptionReturn {
  isConnected: boolean;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  resetTimeout: number;
  failureThreshold: number;
}

export interface EventCache {
  add: (eventId: string) => void;
  has: (eventId: string) => boolean;
  cleanup: () => void;
}
