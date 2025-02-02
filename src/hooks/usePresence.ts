import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PresenceState {
  online: boolean;
  lastSeen?: string;
}

export const usePresence = (userId: string, roomId: string) => {
  const [presenceState, setPresenceState] = useState<Record<string, PresenceState>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { toast } = useToast();
  const heartbeatInterval = useRef<number>();

  const setupPresence = () => {
    console.log('[Presence] Setting up presence for room:', roomId);
    
    try {
      channelRef.current = supabase.channel(`presence_${roomId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channelRef.current?.presenceState() || {};
          console.log('[Presence] Sync state:', state);
          setPresenceState(state as Record<string, PresenceState>);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[Presence] Join:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('[Presence] Leave:', key, leftPresences);
        });

      channelRef.current.subscribe(async (status) => {
        console.log('[Presence] Subscription status:', status);
        
        if (status === 'SUBSCRIBED' && userId) {
          await channelRef.current?.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });

          // Setup heartbeat
          heartbeatInterval.current = window.setInterval(async () => {
            await channelRef.current?.track({
              user_id: userId,
              online_at: new Date().toISOString(),
            });
          }, 30000) as unknown as number;
        }
      });
    } catch (error) {
      console.error('[Presence] Error setting up presence:', error);
      toast({
        title: "Erreur de présence",
        description: "Impossible de détecter la présence des utilisateurs",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (userId) {
      setupPresence();
    }
    
    return () => {
      console.log('[Presence] Cleaning up presence');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [userId, roomId]);

  return presenceState;
};