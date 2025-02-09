
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PresenceState {
  online: boolean;
  lastSeen?: string;
}

interface UserPresence {
  user_id: string;
  online_at: string;
  presence_ref: string;
}

export const usePresence = (userId: string, roomId: string) => {
  const [presenceState, setPresenceState] = useState<Record<string, PresenceState>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { toast } = useToast();
  const heartbeatInterval = useRef<number>();
  const isIOSRef = useRef(/iPad|iPhone|iPod/.test(navigator.userAgent));
  const isBackgroundRef = useRef(false);

  const setupPresence = () => {
    console.log('[Presence] Setting up presence for room:', roomId);
    
    try {
      channelRef.current = supabase.channel(`presence_${roomId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channelRef.current?.presenceState() || {};
          console.log('[Presence] Sync state:', state);
          
          // Transform the presence data to match our PresenceState interface
          const transformedState: Record<string, PresenceState> = {};
          Object.entries(state).forEach(([key, value]) => {
            // Cast the value to unknown first, then to UserPresence[]
            const presences = value as unknown as UserPresence[];
            if (presences.length > 0) {
              transformedState[key] = {
                online: true,
                lastSeen: presences[0].online_at
              };
            }
          });
          
          setPresenceState(transformedState);
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
          try {
            // Update connection status in database
            await supabase
              .from('interpreter_connection_status')
              .upsert({
                interpreter_id: userId,
                is_online: true,
                last_seen_at: new Date().toISOString(),
                last_heartbeat: new Date().toISOString(),
                connection_status: isBackgroundRef.current ? 'background' : 'connected'
              })
              .eq('interpreter_id', userId);

            // Track presence state
            await channelRef.current?.track({
              user_id: userId,
              online_at: new Date().toISOString(),
            });

            // Setup heartbeat
            heartbeatInterval.current = window.setInterval(async () => {
              try {
                if (!isBackgroundRef.current) {
                  await supabase
                    .from('interpreter_connection_status')
                    .update({
                      last_heartbeat: new Date().toISOString(),
                      connection_status: 'connected'
                    })
                    .eq('interpreter_id', userId);

                  await channelRef.current?.track({
                    user_id: userId,
                    online_at: new Date().toISOString(),
                  });
                }
              } catch (error) {
                console.error('[Presence] Heartbeat error:', error);
              }
            }, 30000) as unknown as number;
          } catch (error) {
            console.error('[Presence] Error setting up presence:', error);
            toast({
              title: "Erreur de présence",
              description: "Impossible de mettre à jour votre statut de présence",
              variant: "destructive",
            });
          }
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
    
    const handleVisibilityChange = async () => {
      const isVisible = document.visibilityState === 'visible';
      isBackgroundRef.current = !isVisible;
      
      if (userId) {
        try {
          await supabase
            .from('interpreter_connection_status')
            .update({
              connection_status: isVisible ? 'connected' : 'background',
              last_seen_at: new Date().toISOString()
            })
            .eq('interpreter_id', userId);

          // For iOS, we force a new subscription when coming back to foreground
          if (isVisible && isIOSRef.current && channelRef.current) {
            console.log('[Presence] iOS detected - forcing channel resubscription');
            supabase.removeChannel(channelRef.current);
            setupPresence();
          }
        } catch (error) {
          console.error('[Presence] Error updating visibility state:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      console.log('[Presence] Cleaning up presence');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }

      // Update connection status to disconnected
      if (userId) {
        supabase
          .from('interpreter_connection_status')
          .update({
            is_online: false,
            connection_status: 'disconnected',
            last_seen_at: new Date().toISOString()
          })
          .eq('interpreter_id', userId)
          .then(() => console.log('[Presence] Updated connection status to disconnected'))
          .catch(error => console.error('[Presence] Error updating disconnected status:', error));
      }
    };
  }, [userId, roomId]);

  return presenceState;
};
