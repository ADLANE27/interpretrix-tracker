import { useEffect } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
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
    let channel: RealtimeChannel;

    const setupSubscription = () => {
      channel = supabase
        .channel('db-changes')
        .on(
          'postgres_changes' as const,
          {
            event: config.event,
            schema: config.schema || 'public',
            table: config.table,
            filter: config.filter,
          },
          callback
        )
        .subscribe((status) => {
          console.log(`Realtime subscription status: ${status}`);
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [config, callback]);
}