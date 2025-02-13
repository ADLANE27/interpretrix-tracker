
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export const useSupabaseConnection = () => {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const lastHeartbeatRef = useRef<Date>();
  const wakeLockRef = useRef<any>(null);
  const maxReconnectAttempts = 10;
  const reconnectDelay = 5000;
  const heartbeatTimeout = 35000; // 35 secondes pour détecter un heartbeat manqué

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[useSupabaseConnection] Wake Lock is active');
      }
    } catch (err) {
      console.error('[useSupabaseConnection] Wake Lock error:', err);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
        .then(() => {
          console.log('[useSupabaseConnection] Wake Lock released');
          wakeLockRef.current = null;
        })
        .catch((err: Error) => console.error('[useSupabaseConnection] Wake Lock release error:', err));
    }
  };

  const setupHeartbeat = (channel: RealtimeChannel) => {
    // Envoyer un heartbeat toutes les 30 secondes
    const heartbeatInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('[useSupabaseConnection] No active session, stopping heartbeat');
          clearInterval(heartbeatInterval);
          releaseWakeLock();
          return;
        }

        if (channel.state === 'joined') {
          const heartbeatPromise = channel.send({
            type: 'broadcast',
            event: 'heartbeat',
            payload: { timestamp: new Date().toISOString() }
          });

          // Timeout si pas de réponse dans les 5 secondes
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Heartbeat timeout')), 5000)
          );

          try {
            await Promise.race([heartbeatPromise, timeoutPromise]);
            lastHeartbeatRef.current = new Date();
            console.log('[useSupabaseConnection] Heartbeat sent successfully');
          } catch (error) {
            console.error('[useSupabaseConnection] Failed to send heartbeat:', error);
            handleReconnect();
          }
        } else {
          console.warn('[useSupabaseConnection] Channel not joined, attempting to rejoin');
          handleReconnect();
        }
      } catch (error) {
        console.error('[useSupabaseConnection] Error in heartbeat:', error);
        handleReconnect();
      }
    }, 30000);

    // Vérifier les heartbeats manqués
    const heartbeatCheckInterval = setInterval(() => {
      if (lastHeartbeatRef.current) {
        const timeSinceLastHeartbeat = new Date().getTime() - lastHeartbeatRef.current.getTime();
        if (timeSinceLastHeartbeat > heartbeatTimeout) {
          console.error('[useSupabaseConnection] Missed heartbeat detected');
          handleReconnect();
        }
      }
    }, 5000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(heartbeatCheckInterval);
    };
  };

  const initializeChannel = async () => {
    try {
      console.log('[useSupabaseConnection] Initializing realtime connection...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[useSupabaseConnection] No active session, aborting connection');
        releaseWakeLock();
        return () => {};
      }

      // Demander le wake lock
      await requestWakeLock();
      
      // Nettoyer l'ancien canal
      if (channelRef.current) {
        console.log('[useSupabaseConnection] Cleaning up existing channel');
        supabase.removeChannel(channelRef.current);
      }

      let heartbeatCleanup: (() => void) | undefined;

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
        lastHeartbeatRef.current = new Date();
      })
      .subscribe(async (status) => {
        console.log('[useSupabaseConnection] Subscription status:', status);

        if (status === 'SUBSCRIBED') {
          console.log('[useSupabaseConnection] Successfully subscribed');
          reconnectAttemptsRef.current = 0;
          lastHeartbeatRef.current = new Date();

          try {
            await channelRef.current?.track({
              online_at: new Date().toISOString(),
              status: 'online'
            });
            console.log('[useSupabaseConnection] Successfully tracked presence');
            
            // Configurer le heartbeat seulement après une connexion réussie
            if (heartbeatCleanup) {
              heartbeatCleanup();
            }
            heartbeatCleanup = setupHeartbeat(channelRef.current);
          } catch (error) {
            console.error('[useSupabaseConnection] Error tracking presence:', error);
            handleReconnect();
          }
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`[useSupabaseConnection] Channel ${status}, attempting to reconnect...`);
          handleReconnect();
        }
      });

      // Retourner une fonction de nettoyage
      return () => {
        if (heartbeatCleanup) {
          heartbeatCleanup();
        }
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
        releaseWakeLock();
      };
    } catch (error) {
      console.error('[useSupabaseConnection] Error initializing channel:', error);
      handleReconnect();
      return () => {};
    }
  };

  const handleReconnect = () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        console.log('[useSupabaseConnection] No active session, skipping reconnection');
        releaseWakeLock();
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
    let cleanupFn = () => {};
    
    // Initialisation asynchrone
    initializeChannel().then(cleanup => {
      cleanupFn = cleanup;
    });

    // Vérifier périodiquement la session et la connexion
    const sessionCheckInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[useSupabaseConnection] Session check: No active session');
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        releaseWakeLock();
      } else if (!channelRef.current || channelRef.current.state !== 'joined') {
        console.log('[useSupabaseConnection] Session check: Channel not active, reinitializing');
        initializeChannel();
      }
    }, 60000);

    // Gérer les changements de visibilité de la page
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[useSupabaseConnection] Page became visible, checking connection...');
        await requestWakeLock();
        if (channelRef.current?.state !== 'joined') {
          console.log('[useSupabaseConnection] Channel not joined, reinitializing...');
          initializeChannel();
        }
      } else {
        console.log('[useSupabaseConnection] Page hidden, maintaining connection...');
      }
    };

    // Gérer les changements de connexion réseau
    const handleOnline = () => {
      console.log('[useSupabaseConnection] Network connection restored, reinitializing...');
      initializeChannel();
    };

    const handleOffline = () => {
      console.log('[useSupabaseConnection] Network connection lost');
      // Ne pas fermer la connexion, elle sera restaurée automatiquement
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
        releaseWakeLock();
      }
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      cleanupFn();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        console.log('[useSupabaseConnection] Cleaning up channel');
        supabase.removeChannel(channelRef.current);
      }
      clearInterval(sessionCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      subscription.unsubscribe();
      releaseWakeLock();
    };
  }, []);

  return channelRef.current;
};
