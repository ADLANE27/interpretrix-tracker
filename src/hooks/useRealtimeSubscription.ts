import { useEffect } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
  event: RealtimeEvent;
  schema?: string;
  table: string;
  filter?: string;
}

export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: config.event,
          schema: config.schema || 'public',
          table: config.table,
          filter: config.filter,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [config, callback]);
}