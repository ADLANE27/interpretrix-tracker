
import { useRealtimeSubscription } from './use-realtime-subscription';
import { realtimeService } from '@/services/realtime';
import { useEffect } from 'react';

/**
 * A hook to subscribe to table changes in Supabase
 */
export const useTableSubscription = (
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  filter: string | null,
  callback: (payload: any) => void,
  options: {
    debugMode?: boolean;
    maxRetries?: number;
    retryInterval?: number;
    onError?: (error: any) => void;
  } = {}
) => {
  // Initialize realtimeService on component mount
  useEffect(() => {
    const cleanup = realtimeService.init();
    return cleanup;
  }, []);

  // Use the more general useRealtimeSubscription hook with our parameters
  useRealtimeSubscription(
    {
      event,
      table,
      filter
    },
    callback,
    options
  );
};
