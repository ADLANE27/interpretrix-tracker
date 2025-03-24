
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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
}

export type SubscriptionCallback = (payload: RealtimePostgresChangesPayload<any>) => void;
