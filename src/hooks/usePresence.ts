
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
  const reconnectTimeout = useRef<number>();
  const isIOSRef = useRef(/iPad|iPhone|iPod/.test(navigator.userAgent));
  const isBackgroundRef = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRY_COUNT = 5;
  const RETRY_DELAY = 5000;

  const updateConnectionStatus = async (status: 'connected' | 'background' | 'disconnected') => {
    console.log('[Presence] Updating connection status:', status);
    try {
      await supabase
        .from('interpreter_connection_status')
        .upsert({
          interpreter_id: userId,
          is_online: status !== 'disconnected',
          last_seen_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString(),
          connection_status: status
        })
        .eq('interpreter_id', userId);
    } catch (error) {
      console.error('[Presence] Error updating connection status:', error);
    }
  };

  const setupPresence = () => {
    console.log('[Presence] Setting up presence for room:', roomId);
    
    try {
      if (channelRef.current) {
        console.log('[Presence] Cleaning up existing channel');
        supabase.removeChannel(channelRef.current);
      }

      channelRef.current = supabase.channel(`presence_${roomId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channelRef.current?.presenceState() || {};
          console.log('[Presence] Sync state:', state);
          
          const transformedState: Record<string, PresenceState> = {};
          Object.entries(state).forEach(([key, value]) => {
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
          retryCount.current = 0; // Reset retry count on successful join
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('[Presence] Leave:', key, leftPresences);
        });

      channelRef.current.subscribe(async (status) => {
        console.log('[Presence] Subscription status:', status);
        
        if (status === 'SUBSCRIBED' && userId) {
          try {
            await updateConnectionStatus(isBackgroundRef.current ? 'background' : 'connected');

            await channelRef.current?.track({
              user_id: userId,
              online_at: new Date().toISOString(),
            });

            // Setup heartbeat
            if (heartbeatInterval.current) {
              clearInterval(heartbeatInterval.current);
            }

            heartbeatInterval.current = window.setInterval(async () => {
              try {
                await updateConnectionStatus(isBackgroundRef.current ? 'background' : 'connected');
                await channelRef.current?.track({
                  user_id: userId,
                  online_at: new Date().toISOString(),
                });
              } catch (error) {
                console.error('[Presence] Heartbeat error:', error);
                if (retryCount.current < MAX_RETRY_COUNT) {
                  retryCount.current++;
                  setupPresence();
                }
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
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Presence] Channel error occurred');
          if (retryCount.current < MAX_RETRY_COUNT) {
            retryCount.current++;
            if (reconnectTimeout.current) {
              clearTimeout(reconnectTimeout.current);
            }
            reconnectTimeout.current = window.setTimeout(() => {
              setupPresence();
            }, RETRY_DELAY) as unknown as number;
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
          await updateConnectionStatus(isVisible ? 'connected' : 'background');

          // For iOS, we force a new subscription when coming back to foreground
          if (isVisible && isIOSRef.current && channelRef.current) {
            console.log('[Presence] iOS detected - forcing channel resubscription');
            setupPresence();
          }
        } catch (error) {
          console.error('[Presence] Error updating visibility state:', error);
        }
      }
    };

    const handleOnline = () => {
      console.log('[Presence] Browser online');
      if (userId) {
        setupPresence();
      }
    };

    const handleOffline = () => {
      console.log('[Presence] Browser offline');
      if (userId) {
        updateConnectionStatus('disconnected');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      console.log('[Presence] Cleaning up presence');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }

      // Update connection status to disconnected
      if (userId) {
        updateConnectionStatus('disconnected')
          .then(() => console.log('[Presence] Updated connection status to disconnected'))
          .catch((error: Error) => console.error('[Presence] Error updating disconnected status:', error));
      }
    };
  }, [userId, roomId]);

  return presenceState;
};
