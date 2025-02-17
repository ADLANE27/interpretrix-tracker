
import { useEffect, useRef, useCallback } from 'react';
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
  const heartbeatTimeout = 35000;

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current && document.visibilityState === 'visible') {
        console.log('[useSupabaseConnection] Requesting Wake Lock');
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[useSupabaseConnection] Wake Lock is active');
        
        wakeLockRef.current.addEventListener('release', async () => {
          console.log('[useSupabaseConnection] Wake Lock was released');
          wakeLockRef.current = null;
          if (!isExplicitDisconnectRef.current && document.visibilityState === 'visible') {
            console.log('[useSupabaseConnection] Attempting to reacquire Wake Lock');
            await requestWakeLock();
          }
        });
      }
    } catch (err) {
      if (document.visibilityState === 'visible') {
        console.error('[useSupabaseConnection] Wake Lock error:', err);
        if (!isExplicitDisconnectRef.current) {
          setTimeout(() => requestWakeLock(), 5000);
        }
      }
    }
  };

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
        .then(() => {
          console.log('[useSupabaseConnection] Wake Lock released');
          wakeLockRef.current = null;
        })
        .catch((err: Error) => console.error('[useSupabaseConnection] Wake Lock release error:', err));
    }
  }, []);

  const clearAllIntervals = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (heartbeatCheckIntervalRef.current) {
      clearInterval(heartbeatCheckIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const setupHeartbeat = useCallback((channel: RealtimeChannel) => {
    clearAllIntervals();

    const checkConnectionHealth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('[useSupabaseConnection] No active session during health check');
          clearAllIntervals();
          if (!isExplicitDisconnectRef.current) {
            handleReconnect();
          }
          return false;
        }

        if (!channel || channel.state !== 'joined') {
          console.warn('[useSupabaseConnection] Channel not joined during health check');
          if (!isExplicitDisconnectRef.current) {
            handleReconnect();
          }
          return false;
        }

        return true;
      } catch (error) {
        console.error('[useSupabaseConnection] Error in health check:', error);
        if (!isExplicitDisconnectRef.current) {
          handleReconnect();
        }
        return false;
      }
    };

    checkConnectionHealth();

    heartbeatIntervalRef.current = setInterval(async () => {
      if (!await checkConnectionHealth()) return;

      try {
        const heartbeatPromise = channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: new Date().toISOString() }
        });

        await Promise.race([
          heartbeatPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Heartbeat timeout')), 5000)
          )
        ]);
        lastHeartbeatRef.current = new Date();
        console.log('[useSupabaseConnection] Heartbeat sent successfully');
      } catch (error) {
        console.error('[useSupabaseConnection] Failed to send heartbeat:', error);
        if (!isExplicitDisconnectRef.current) {
          handleReconnect();
        }
      }
    }, 30000);

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
  }, [clearAllIntervals]);

  const handleReconnect = useCallback(async () => {
    if (isExplicitDisconnectRef.current) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('[useSupabaseConnection] No active session, skipping reconnection');
      isExplicitDisconnectRef.current = true;
      clearAllIntervals();
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
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
  }, [clearAllIntervals, releaseWakeLock, toast]);

  const initializeChannel = useCallback(async () => {
    try {
      console.log('[useSupabaseConnection] Initializing realtime connection...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[useSupabaseConnection] No active session, aborting connection');
        releaseWakeLock();
        return () => {};
      }

      isExplicitDisconnectRef.current = false;
      await requestWakeLock();
      
      if (channelRef.current) {
        console.log('[useSupabaseConnection] Cleaning up existing channel');
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      console.log('[useSupabaseConnection] Creating new channel...');
      channelRef.current = supabase.channel('app-health', {
        config: {
          broadcast: { ack: true },
          presence: { key: 'status' }
        }
      });

      if (!channelRef.current) {
        console.error('[useSupabaseConnection] Failed to create channel');
        return () => {};
      }

      channelRef.current
        .on('presence', { event: 'sync' }, () => {
          if (isExplicitDisconnectRef.current || !channelRef.current) return;

          const state = channelRef.current.presenceState();
          console.log('[useSupabaseConnection] Presence sync state:', state);
          
          if (!state || Object.keys(state).length === 0) {
            console.warn('[useSupabaseConnection] No presence state, attempting to rejoin');
            handleReconnect();
          }
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (!isExplicitDisconnectRef.current) {
            console.log('[useSupabaseConnection] Join event:', { key, newPresences });
            lastHeartbeatRef.current = new Date();
          }
        })
        .on('broadcast', { event: 'heartbeat' }, (payload) => {
          if (!isExplicitDisconnectRef.current) {
            console.log('[useSupabaseConnection] Heartbeat received:', payload);
            lastHeartbeatRef.current = new Date();
          }
        });

      console.log('[useSupabaseConnection] Subscribing to channel...');
      const subscription = await channelRef.current.subscribe(async (status) => {
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

      return () => {
        isExplicitDisconnectRef.current = true;
        clearAllIntervals();
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
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
  }, [clearAllIntervals, handleReconnect, releaseWakeLock, setupHeartbeat]);

  useEffect(() => {
    let mounted = true;
    let cleanup = () => {};

    const setup = async () => {
      if (!mounted) return;
      cleanup = await initializeChannel();
    };

    setup();

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
          cleanup = await initializeChannel();
        }
      } catch (error) {
        console.error('[useSupabaseConnection] Session check error:', error);
        if (!isExplicitDisconnectRef.current) {
          handleReconnect();
        }
      }
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useSupabaseConnection] Page became visible, checking connection...');
        if (!isExplicitDisconnectRef.current) {
          requestWakeLock().then(() => {
            if (!channelRef.current || channelRef.current.state !== 'joined') {
              initializeChannel().then(newCleanup => {
                if (mounted) {
                  cleanup();
                  cleanup = newCleanup;
                }
              });
            }
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        isExplicitDisconnectRef.current = true;
        clearAllIntervals();
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        releaseWakeLock();
      }
    });

    return () => {
      mounted = false;
      cleanup();
      clearInterval(sessionCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
      clearAllIntervals();
      releaseWakeLock();
    };
  }, [clearAllIntervals, initializeChannel, releaseWakeLock]);

  return channelRef.current;
};
