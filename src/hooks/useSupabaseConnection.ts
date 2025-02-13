
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export const useSupabaseConnection = () => {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectDelay = 5000;

  const setupHeartbeat = (channel: RealtimeChannel) => {
    // Envoyer un heartbeat toutes les 30 secondes
    const heartbeatInterval = setInterval(() => {
      if (channel.state === 'joined') {
        try {
          // Vérifier d'abord la session
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
              console.log('[useSupabaseConnection] No active session, stopping heartbeat');
              clearInterval(heartbeatInterval);
              return;
            }

            channel.send({
              type: 'broadcast',
              event: 'heartbeat',
              payload: { timestamp: new Date().toISOString() }
            }).then(() => {
              console.log('[useSupabaseConnection] Heartbeat sent successfully');
            }).catch((error) => {
              console.error('[useSupabaseConnection] Failed to send heartbeat:', error);
              handleReconnect();
            });
          });
        } catch (error) {
          console.error('[useSupabaseConnection] Error in heartbeat:', error);
          handleReconnect();
        }
      } else {
        console.warn('[useSupabaseConnection] Channel not joined, attempting to rejoin');
        handleReconnect();
      }
    }, 30000);

    return heartbeatInterval;
  };

  const initializeChannel = () => {
    try {
      console.log('[useSupabaseConnection] Initializing realtime connection...');
      
      // Nettoyer l'ancien canal
      if (channelRef.current) {
        console.log('[useSupabaseConnection] Cleaning up existing channel');
        supabase.removeChannel(channelRef.current);
      }

      // Vérifier la session avant de créer le canal
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          console.log('[useSupabaseConnection] No active session, aborting connection');
          return;
        }

        // Créer un nouveau canal avec un heartbeat
        channelRef.current = supabase.channel('app-health', {
          config: {
            broadcast: { ack: true },
            presence: { key: 'status' }
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channelRef.current?.presenceState();
          console.log('[useSupabaseConnection] Presence sync state:', state);
          
          // Vérifier si nous sommes toujours présents dans le canal
          if (!state || Object.keys(state).length === 0) {
            console.warn('[useSupabaseConnection] No presence state, attempting to rejoin');
            handleReconnect();
          }
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[useSupabaseConnection] Join event:', { key, newPresences });
        })
        .on('broadcast', { event: 'heartbeat' }, (payload) => {
          console.log('[useSupabaseConnection] Heartbeat received:', payload);
        })
        .subscribe(async (status) => {
          console.log('[useSupabaseConnection] Subscription status:', status);

          if (status === 'SUBSCRIBED') {
            console.log('[useSupabaseConnection] Successfully subscribed');
            reconnectAttemptsRef.current = 0;

            try {
              // Tracker la présence
              await channelRef.current?.track({
                online_at: new Date().toISOString(),
                status: 'online'
              });
              console.log('[useSupabaseConnection] Successfully tracked presence');
            } catch (error) {
              console.error('[useSupabaseConnection] Error tracking presence:', error);
              handleReconnect();
            }
          }

          if (status === 'CHANNEL_ERROR') {
            console.error('[useSupabaseConnection] Channel error, attempting to reconnect...');
            handleReconnect();
          }

          if (status === 'TIMED_OUT') {
            console.error('[useSupabaseConnection] Connection timed out, attempting to reconnect...');
            handleReconnect();
          }

          if (status === 'CLOSED') {
            console.error('[useSupabaseConnection] Channel closed, attempting to reconnect...');
            handleReconnect();
          }
        });

        // Configurer le heartbeat
        const heartbeatInterval = setupHeartbeat(channelRef.current);
        return () => {
          clearInterval(heartbeatInterval);
        };
      });

    } catch (error) {
      console.error('[useSupabaseConnection] Error initializing channel:', error);
      handleReconnect();
    }
  };

  const handleReconnect = () => {
    // Vérifier d'abord la session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        console.log('[useSupabaseConnection] No active session, skipping reconnection');
        return;
      }

      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.error('[useSupabaseConnection] Max reconnection attempts reached');
        toast({
          title: "Erreur de connexion",
          description: "La connexion temps réel a été perdue. Veuillez rafraîchir la page.",
          variant: "destructive",
          duration: 0,
        });
        return;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[useSupabaseConnection] Attempting to reconnect...');
        reconnectAttemptsRef.current++;
        initializeChannel();
      }, reconnectDelay);
    });
  };

  useEffect(() => {
    const cleanup = initializeChannel();

    // Vérifier périodiquement la session et la connexion
    const sessionCheckInterval = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          console.log('[useSupabaseConnection] Session check: No active session');
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
        } else if (!channelRef.current || channelRef.current.state !== 'joined') {
          console.log('[useSupabaseConnection] Session check: Channel not active, reinitializing');
          initializeChannel();
        }
      });
    }, 60000); // Vérifier toutes les minutes

    // Gérer les changements de visibilité de la page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useSupabaseConnection] Page became visible, checking connection...');
        if (channelRef.current?.state !== 'joined') {
          console.log('[useSupabaseConnection] Channel not joined, reinitializing...');
          initializeChannel();
        }
      }
    };

    // Gérer les changements de connexion réseau
    const handleOnline = () => {
      console.log('[useSupabaseConnection] Network connection restored, reinitializing...');
      initializeChannel();
    };

    // Gérer les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useSupabaseConnection] Auth state changed:', event);
      if (event === 'SIGNED_OUT' || !session) {
        if (channelRef.current) {
          console.log('[useSupabaseConnection] User signed out, cleaning up channel');
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      }
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      if (cleanup) cleanup();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        console.log('[useSupabaseConnection] Cleaning up channel');
        supabase.removeChannel(channelRef.current);
      }
      clearInterval(sessionCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      subscription.unsubscribe();
    };
  }, []);

  return channelRef.current;
};
