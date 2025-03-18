
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export const useMissionUpdates = (onUpdate: () => void) => {
  useEffect(() => {
    console.log('[useMissionUpdates] Setting up realtime subscriptions');
    const channels: RealtimeChannel[] = [];

    // Subscribe to changes in interpretation_missions
    const missionsChannel = supabase.channel('mission-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpretation_missions'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[useMissionUpdates] Mission update received:', payload);
          onUpdate();
        }
      )
      .subscribe();
    channels.push(missionsChannel);

    // Subscribe to changes in private_reservations
    const reservationsChannel = supabase.channel('reservation-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_reservations'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[useMissionUpdates] Private reservation update received:', payload);
          onUpdate();
        }
      )
      .subscribe();
    channels.push(reservationsChannel);

    return () => {
      console.log('[useMissionUpdates] Cleaning up subscriptions');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [onUpdate]);
};
