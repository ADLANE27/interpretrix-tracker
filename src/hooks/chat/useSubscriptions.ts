
import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useSubscriptions = () => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel('table-db-changes');
    
    channel
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('Broadcast received:', payload);
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return channelRef.current;
};
