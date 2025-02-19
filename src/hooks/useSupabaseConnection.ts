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
  const heartbeatInterval = 30000;

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
            await requestWakeLock();
          }
        });
      }
    } catch (err) {
      console.error('[useSupabaseConnection] Wake Lock error:', err);
      if (document.visibilityState === 'visible' && !isExplicitDisconnectRef.current) {
        setTimeout(() => requestWakeLock(), 5000);
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
      heartbeatIntervalRef.current = undefined;
    }
    if (heartbeatCheckIntervalRef.current) {
      clearInterval(heartbeatCheckIntervalRef.current);
      heartbeatCheckIntervalRef.current = undefined;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, []);

  const setupHeartbeat = useCallback((channel: RealtimeChannel) => {
    if (!channel || channel.state !== 'joined') {
      console.warn('[useSupabaseConnection] Cannot setup heartbeat - channel not joined');
      return;
    }

    clearAllIntervals();

    lastHeartbeatRef.current = new Date();

    const sendHeartbeat = async () => {
      try {
        if (channel.state !== 'joined') {
          console.warn('[useSupabaseConnection] Channel not joined during heartbeat');
          return false;
        }

        await channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: new Date().toISOString() }
        });

        lastHeartbeatRef.current = new Date();
        console.log('[useSupabaseConnection] Heartbeat sent successfully');
        return true;
      } catch (error) {
        console.error('[useSupabaseConnection] Heartbeat send error:', error);
        return false;
      }
    };

    sendHeartbeat();

    heartbeatIntervalRef.current = setInterval(async () => {
      const success = await sendHeartbeat();
      if (!success && !isExplicitDisconnectRef.current) {
        console.log('[useSupabaseConnection] Heartbeat failed, initiating reconnect');
        handleReconnect();
      }
    }, heartbeatInterval);

    heartbeatCheckIntervalRef.current = setInterval(() => {
      if (lastHeartbeatRef.current && !isExplicitDisconnectRef.current) {
        const timeSinceLastHeartbeat = new Date().getTime() - lastHeartbeatRef.current.getTime();
        if (timeSinceLastHeartbeat > heartbeatTimeout) {
          console.warn('[useSupabaseConnection] Heartbeat timeout detected:', {
            timeSinceLastHeartbeat,
            heartbeatTimeout,
            lastHeartbeat: lastHeartbeatRef.current
          });
          handleReconnect();
        }
      }
    }, 5000);
  }, [clearAllIntervals]);

  const handleReconnect = useCallback(async () => {
    if (isExplicitDisconnectRef.current) {
      console.log('[useSupabaseConnection] Skipping reconnect - explicit disconnect');
      return;
    }

    clearAllIntervals();

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('[useSupabaseConnection] Max reconnection attempts reached');
      isExplicitDisconnectRef.current = true;
      toast({
        title: "Erreur de connexion",
        description: "La connexion temps réel a été perdue. Veuillez rafraîchir la page.",
        variant: "destructive",
        duration: 0,
      });
      return;
    }

    console.log('[useSupabaseConnection] Attempting reconnection:', {
      attempt: reconnectAttemptsRef.current + 1,
      maxAttempts: maxReconnectAttempts
    });

    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      initializeChannel();
    }, reconnectDelay);
  }, [clearAllIntervals, toast, initializeChannel]);

  const initializeChannel = useCallback(async () => {
    try {
      console.log('[useSupabaseConnection] Initializing channel');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[useSupabaseConnection] No active session, skipping connection');
        releaseWakeLock();
        return () => {};
      }

      isExplicitDisconnectRef.current = false;
      await requestWakeLock();
      
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      channelRef.current = supabase.channel('app-health', {
        config: {
          broadcast: { ack: true },
          presence: { key: 'status' }
        }
      });

      if (!channelRef.current) {
        throw new Error('Failed to create channel');
      }

      channelRef.current
        .on('presence', { event: 'sync' }, () => {
          if (!channelRef.current || isExplicitDisconnectRef.current) return;
          
          const state = channelRef.current.presenceState();
          console.log('[useSupabaseConnection] Presence sync:', state);
          
          if (!state || Object.keys(state).length === 0) {
            console.warn('[useSupabaseConnection] Empty presence state');
            handleReconnect();
          }
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (!isExplicitDisconnectRef.current) {
            console.log('[useSupabaseConnection] Presence join:', { key, newPresences });
            lastHeartbeatRef.current = new Date();
          }
        })
        .on('broadcast', { event: 'heartbeat' }, (payload) => {
          if (!isExplicitDisconnectRef.current) {
            console.log('[useSupabaseConnection] Heartbeat received:', payload);
            lastHeartbeatRef.current = new Date();
          }
        });

      console.log('[useSupabaseConnection] Subscribing to channel');
      
      await channelRef.current.subscribe(async (status) => {
        console.log('[useSupabaseConnection] Channel status:', status);

        if (status === 'SUBSCRIBED' && !isExplicitDisconnectRef.current) {
          reconnectAttemptsRef.current = 0;
          lastHeartbeatRef.current = new Date();

          try {
            await channelRef.current?.track({
              online_at: new Date().toISOString(),
              status: 'online'
            });
            
            setupHeartbeat(channelRef.current);
          } catch (error) {
            console.error('[useSupabaseConnection] Track error:', error);
            if (!isExplicitDisconnectRef.current) {
              handleReconnect();
            }
          }
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`[useSupabaseConnection] Channel ${status}`);
          if (!isExplicitDisconnectRef.current) {
            handleReconnect();
          }
        }
      });

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };

    } catch (error) {
      console.error('[useSupabaseConnection] Channel initialization error:', error);
      if (!isExplicitDisconnectRef.current) {
        handleReconnect();
      }
      return () => {};
    }
  }, [clearAllIntervals, releaseWakeLock, setupHeartbeat]);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) = () => {};

    const setup = async () => {
      if (!mounted) return;
      const cleanupFn = await initializeChannel();
      if (mounted) {
        cleanup = cleanupFn || (() => {});
      }
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
          console.log('[useSupabaseConnection] Session check: Channel reconnect needed');
          await initializeChannel();
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
        console.log('[useSupabaseConnection] Page visible');
        if (!isExplicitDisconnectRef.current) {
          requestWakeLock().then(() => {
            if (!channelRef.current || channelRef.current.state !== 'joined') {
              initializeChannel();
            }
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        console.log('[useSupabaseConnection] User signed out');
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
