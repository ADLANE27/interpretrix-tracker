
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
  const isReconnectingRef = useRef(false);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 2000;
  const heartbeatTimeout = 60000;
  const heartbeatInterval = 45000;
  const presenceValidationDelay = 2000; // Wait 2s before validating presence

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current && document.visibilityState === 'visible') {
        console.log('[useSupabaseConnection] Requesting Wake Lock');
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[useSupabaseConnection] Wake Lock is active');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('[useSupabaseConnection] Wake Lock was released');
          wakeLockRef.current = null;
        });
      }
    } catch (err) {
      console.error('[useSupabaseConnection] Wake Lock error:', err);
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

  const validateChannelPresence = useCallback(async (channel: RealtimeChannel): Promise<boolean> => {
    try {
      if (!channel || channel.state !== 'joined') {
        console.warn('[useSupabaseConnection] Channel not in correct state for presence validation');
        return false;
      }

      // Initial track to establish presence
      await channel.track({
        online_at: new Date().toISOString(),
        status: 'online'
      });

      // Wait for presence to be established
      await new Promise(resolve => setTimeout(resolve, presenceValidationDelay));

      const state = channel.presenceState();
      console.log('[useSupabaseConnection] Validating presence state:', state);
      
      return state && Object.keys(state).length > 0;
    } catch (error) {
      console.error('[useSupabaseConnection] Presence validation error:', error);
      return false;
    }
  }, [presenceValidationDelay]);

  const setupHeartbeat = useCallback((channel: RealtimeChannel) => {
    if (!channel || channel.state !== 'joined') {
      console.warn('[useSupabaseConnection] Cannot setup heartbeat - channel not joined');
      return false;
    }

    clearAllIntervals();
    lastHeartbeatRef.current = new Date();

    const sendHeartbeat = async () => {
      try {
        if (channel.state !== 'joined' || isExplicitDisconnectRef.current) {
          console.warn('[useSupabaseConnection] Channel not in correct state for heartbeat');
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

    // Initial heartbeat
    sendHeartbeat();

    heartbeatIntervalRef.current = setInterval(async () => {
      if (isExplicitDisconnectRef.current || isReconnectingRef.current) return;
      
      const success = await sendHeartbeat();
      if (!success && !isReconnectingRef.current) {
        console.log('[useSupabaseConnection] Heartbeat failed, initiating reconnect');
        handleReconnectRef.current?.();
      }
    }, heartbeatInterval);

    heartbeatCheckIntervalRef.current = setInterval(() => {
      if (isExplicitDisconnectRef.current || isReconnectingRef.current) return;
      
      if (lastHeartbeatRef.current) {
        const timeSinceLastHeartbeat = new Date().getTime() - lastHeartbeatRef.current.getTime();
        if (timeSinceLastHeartbeat > heartbeatTimeout) {
          console.warn('[useSupabaseConnection] Heartbeat timeout detected:', {
            timeSinceLastHeartbeat,
            heartbeatTimeout,
            lastHeartbeat: lastHeartbeatRef.current
          });
          if (!isReconnectingRef.current) {
            handleReconnectRef.current?.();
          }
        }
      }
    }, 10000);

    return true;
  }, [clearAllIntervals]);

  const handleReconnectRef = useRef<() => Promise<void>>();
  
  const initializeChannel = useCallback(async () => {
    try {
      if (isReconnectingRef.current) {
        console.log('[useSupabaseConnection] Already reconnecting, skipping initialization');
        return () => {};
      }

      console.log('[useSupabaseConnection] Initializing channel');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[useSupabaseConnection] No active session, skipping connection');
        releaseWakeLock();
        return () => {};
      }

      isExplicitDisconnectRef.current = false;
      
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Create new channel with acknowledgment enabled
      channelRef.current = supabase.channel('app-health', {
        config: {
          broadcast: { ack: true },
          presence: { key: 'status' }
        }
      });

      if (!channelRef.current) {
        throw new Error('Failed to create channel');
      }

      let presenceValidationTimeout: NodeJS.Timeout;
      let isChannelReady = false;

      // Set up event listeners before subscribing
      channelRef.current
        .on('presence', { event: 'sync' }, async () => {
          if (!channelRef.current || isExplicitDisconnectRef.current || !isChannelReady) return;
          
          // Clear any existing validation timeout
          if (presenceValidationTimeout) {
            clearTimeout(presenceValidationTimeout);
          }

          // Set up new validation timeout
          presenceValidationTimeout = setTimeout(async () => {
            const isValid = await validateChannelPresence(channelRef.current!);
            if (!isValid && !isReconnectingRef.current && !isExplicitDisconnectRef.current) {
              console.warn('[useSupabaseConnection] Invalid presence state detected');
              handleReconnectRef.current?.();
            }
          }, presenceValidationDelay);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (!isExplicitDisconnectRef.current && isChannelReady) {
            console.log('[useSupabaseConnection] Presence join:', { key, newPresences });
            lastHeartbeatRef.current = new Date();
          }
        })
        .on('broadcast', { event: 'heartbeat' }, (payload) => {
          if (!isExplicitDisconnectRef.current && isChannelReady) {
            console.log('[useSupabaseConnection] Heartbeat received:', payload);
            lastHeartbeatRef.current = new Date();
          }
        });

      // Subscribe to channel with state handling
      await channelRef.current.subscribe(async (status) => {
        console.log('[useSupabaseConnection] Channel status:', status);

        if (status === 'SUBSCRIBED' && !isExplicitDisconnectRef.current) {
          isReconnectingRef.current = false;
          reconnectAttemptsRef.current = 0;
          lastHeartbeatRef.current = new Date();

          try {
            // Wait for channel to fully establish
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Validate presence and setup channel
            const isValid = await validateChannelPresence(channelRef.current!);
            if (!isValid) {
              throw new Error('Failed to establish presence');
            }

            // Mark channel as ready and setup heartbeat
            isChannelReady = true;
            const heartbeatSetup = setupHeartbeat(channelRef.current!);
            if (!heartbeatSetup) {
              throw new Error('Failed to setup heartbeat');
            }

            await requestWakeLock();
          } catch (error) {
            console.error('[useSupabaseConnection] Channel setup error:', error);
            if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
              handleReconnectRef.current?.();
            }
          }
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`[useSupabaseConnection] Channel ${status}`);
          isChannelReady = false;
          if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
            handleReconnectRef.current?.();
          }
        }
      });

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        if (presenceValidationTimeout) {
          clearTimeout(presenceValidationTimeout);
        }
      };

    } catch (error) {
      console.error('[useSupabaseConnection] Channel initialization error:', error);
      if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
        handleReconnectRef.current?.();
      }
      return () => {};
    }
  }, [clearAllIntervals, releaseWakeLock, setupHeartbeat, validateChannelPresence]);

  handleReconnectRef.current = async () => {
    if (isExplicitDisconnectRef.current || isReconnectingRef.current) {
      console.log('[useSupabaseConnection] Skipping reconnect - explicit disconnect or already reconnecting');
      return;
    }

    isReconnectingRef.current = true;
    clearAllIntervals();

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('[useSupabaseConnection] Max reconnection attempts reached');
      isExplicitDisconnectRef.current = true;
      isReconnectingRef.current = false;
      toast({
        title: "Erreur de connexion",
        description: "La connexion temps réel a été perdue. Veuillez rafraîchir la page.",
        variant: "destructive",
        duration: 0,
      });
      return;
    }

    const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current), 30000);
    console.log('[useSupabaseConnection] Attempting reconnection:', {
      attempt: reconnectAttemptsRef.current + 1,
      maxAttempts: maxReconnectAttempts,
      delay
    });

    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      initializeChannel();
    }, delay);
  };

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
          if (!isReconnectingRef.current) {
            await initializeChannel();
          }
        }
      } catch (error) {
        console.error('[useSupabaseConnection] Session check error:', error);
        if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
          handleReconnectRef.current?.();
        }
      }
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useSupabaseConnection] Page visible');
        if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
          if (!channelRef.current || channelRef.current.state !== 'joined') {
            initializeChannel();
          }
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
