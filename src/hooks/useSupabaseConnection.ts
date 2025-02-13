
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
  const isExplicitDisconnectRef = useRef(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const heartbeatCheckIntervalRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 10;
  const reconnectDelay = 5000;
  const heartbeatTimeout = 35000; // 35 secondes pour détecter un heartbeat manqué

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[useSupabaseConnection] Wake Lock is active');
        
        // Réessayer d'obtenir le wakeLock s'il est perdu
        wakeLockRef.current.addEventListener('release', async () => {
          console.log('[useSupabaseConnection] Wake Lock was released, attempting to reacquire');
          wakeLockRef.current = null;
          if (!isExplicitDisconnectRef.current) {
            await requestWakeLock();
          }
        });
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

  const clearAllIntervals = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (heartbeatCheckIntervalRef.current) {
      clearInterval(heartbeatCheckIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  };

  const setupHeartbeat = (channel: RealtimeChannel) => {
    clearAllIntervals();

    // Envoyer un heartbeat toutes les 30 secondes
    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('[useSupabaseConnection] No active session, stopping heartbeat');
          clearAllIntervals();
          if (!isExplicitDisconnectRef.current) {
            handleReconnect();
          }
          return;
        }

        if (channel.state === 'joined') {
          const heartbeatPromise = channel.send({
            type: 'broadcast',
            event: 'heartbeat',
            payload: { timestamp: new Date().toISOString() }
          });

          try {
            await Promise.race([
              heartbeatPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Heartbeat timeout')), 5000))
            ]);
            lastHeartbeatRef.current = new Date();
            console.log('[useSupabaseConnection] Heartbeat sent successfully');
          } catch (error) {
            console.error('[useSupabaseConnection] Failed to send heartbeat:', error);
            if (!isExplicitDisconnectRef.current) {
              handleReconnect();
            }
          }
        } else {
          console.warn('[useSupabaseConnection] Channel not joined, attempting to rejoin');
          if (!isExplicitDisconnectRef.current) {
            handleReconnect();
          }
        }
      } catch (error) {
        console.error('[useSupabaseConnection] Error in heartbeat:', error);
        if (!isExplicitDisconnectRef.current) {
          handleReconnect();
        }
      }
    }, 30000);

    // Vérifier les heartbeats manqués plus fréquemment
    heartbeatCheckIntervalRef.current = setInterval(() => {
      if (lastHeartbeatRef.current && !isExplicitDisconnectRef.current) {
        const timeSinceLastHeartbeat = new Date().getTime() - lastHeartbeatRef.current.getTime();
        if (timeSinceLastHeartbeat > heartbeatTimeout) {
          console.error('[useSupabaseConnection] Missed heartbeat detected');
          handleReconnect();
        }
      }
    }, 5000);

    return () => {
      clearAllIntervals();
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

      // Réinitialiser le flag de déconnexion explicite
      isExplicitDisconnectRef.current = false;
      
      // S'assurer d'avoir le wakeLock
      await requestWakeLock();
      
      // Nettoyer l'ancien canal
      if (channelRef.current) {
        console.log('[useSupabaseConnection] Cleaning up existing channel');
        await supabase.removeChannel(channelRef.current);
      }

      // Créer un nouveau canal avec un heartbeat
      channelRef.current = supabase.channel('app-health', {
        config: {
          broadcast: { ack: true },
          presence: { key: 'status' }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        if (isExplicitDisconnectRef.current) return;

        const state = channelRef.current?.presenceState();
        console.log('[useSupabaseConnection] Presence sync state:', state);
        
        if (!state || Object.keys(state).length === 0) {
          console.warn('[useSupabaseConnection] No presence state, attempting to rejoin');
          handleReconnect();
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[useSupabaseConnection] Join event:', { key, newPresences });
        lastHeartbeatRef.current = new Date();
      })
      .on('broadcast', { event: 'heartbeat' }, (payload) => {
        console.log('[useSupabaseConnection] Heartbeat received:', payload);
        lastHeartbeatRef.current = new Date();
      })
      .subscribe(async (status) => {
        console.log('[useSupabaseConnection] Subscription status:', status);

        if (status === 'SUBSCRIBED' && !isExplicitDisconnectRef.current) {
          console.log('[useSupabaseConnection] Successfully subscribed');
          reconnectAttemptsRef.current = 0;
          lastHeartbeatRef.current = new Date();

          try {
            await channelRef.current?.track({
              online_at: new Date().toISOString(),
              status: 'online'
            });
            console.log('[useSupabaseConnection] Successfully tracked presence');
            setupHeartbeat(channelRef.current);
          } catch (error) {
            console.error('[useSupabaseConnection] Error tracking presence:', error);
            if (!isExplicitDisconnectRef.current) {
              handleReconnect();
            }
          }
        }

        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !isExplicitDisconnectRef.current) {
          console.error(`[useSupabaseConnection] Channel ${status}, attempting to reconnect...`);
          handleReconnect();
        }
      });

      // Retourner une fonction de nettoyage
      return () => {
        isExplicitDisconnectRef.current = true;
        clearAllIntervals();
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
        releaseWakeLock();
      };
    } catch (error) {
      console.error('[useSupabaseConnection] Error initializing channel:', error);
      if (!isExplicitDisconnectRef.current) {
        handleReconnect();
      }
      return () => {};
    }
  };

  const handleReconnect = () => {
    if (isExplicitDisconnectRef.current) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        console.log('[useSupabaseConnection] No active session, skipping reconnection');
        isExplicitDisconnectRef.current = true;
        clearAllIntervals();
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
        if (!isExplicitDisconnectRef.current) {
          console.log('[useSupabaseConnection] Attempting to reconnect...');
          reconnectAttemptsRef.current++;
          initializeChannel();
        }
      }, reconnectDelay);
    });
  };

  useEffect(() => {
    let cleanupFn = () => {};
    
    initializeChannel().then(cleanup => {
      cleanupFn = cleanup;
    });

    const sessionCheckInterval = setInterval(async () => {
      if (isExplicitDisconnectRef.current) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('[useSupabaseConnection] Session check: No active session');
          isExplicitDisconnectRef.current = true;
          clearAllIntervals();
          if (channelRef.current) {
            await supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
          releaseWakeLock();
        } else if (!channelRef.current || channelRef.current.state !== 'joined') {
          console.log('[useSupabaseConnection] Session check: Channel not active, reinitializing');
          initializeChannel();
        }
      } catch (error) {
        console.error('[useSupabaseConnection] Session check error:', error);
        if (!isExplicitDisconnectRef.current) {
          handleReconnect();
        }
      }
    }, 60000);

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[useSupabaseConnection] Page became visible, checking connection...');
        if (!isExplicitDisconnectRef.current) {
          await requestWakeLock();
          if (!channelRef.current || channelRef.current.state !== 'joined') {
            console.log('[useSupabaseConnection] Channel not joined, reinitializing...');
            initializeChannel();
          }
        }
      } else {
        console.log('[useSupabaseConnection] Page hidden, maintaining connection...');
        // La connexion est maintenue même quand la page est cachée
      }
    };

    const handleOnline = () => {
      console.log('[useSupabaseConnection] Network connection restored');
      if (!isExplicitDisconnectRef.current) {
        initializeChannel();
      }
    };

    const handleOffline = () => {
      console.log('[useSupabaseConnection] Network connection lost');
      // Ne pas fermer la connexion, elle sera restaurée automatiquement
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useSupabaseConnection] Auth state changed:', event);
      if (event === 'SIGNED_OUT' || !session) {
        isExplicitDisconnectRef.current = true;
        clearAllIntervals();
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
      isExplicitDisconnectRef.current = true;
      cleanupFn();
      clearAllIntervals();
      if (channelRef.current) {
        console.log('[useSupabaseConnection] Cleaning up channel');
        supabase.removeChannel(channelRef.current);
      }
      clearInterval(sessionCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      subscription.unsubscribe();
      releaseWakeLock();
    };
  }, []);

  return channelRef.current;
};
