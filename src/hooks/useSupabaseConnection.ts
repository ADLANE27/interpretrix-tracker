
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { useWakeLock } from './supabase-connection/useWakeLock';
import { useHeartbeat } from './supabase-connection/useHeartbeat';
import { usePresence } from './supabase-connection/usePresence';
import { CONNECTION_CONSTANTS } from './supabase-connection/constants';

export const useSupabaseConnection = () => {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const isExplicitDisconnectRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const { validateChannelPresence } = usePresence({
    presenceValidationDelay: CONNECTION_CONSTANTS.PRESENCE_VALIDATION_DELAY
  });

  const handleReconnectRef = useRef<() => Promise<void>>();

  const { setupHeartbeat, clearIntervals, updateLastHeartbeat } = useHeartbeat({
    heartbeatInterval: CONNECTION_CONSTANTS.HEARTBEAT_INTERVAL,
    heartbeatTimeout: CONNECTION_CONSTANTS.HEARTBEAT_TIMEOUT,
    onHeartbeatFailed: () => handleReconnectRef.current?.()
  });
  
  const initializeChannel = useCallback(async () => {
    try {
      if (isReconnectingRef.current || hasInitializedRef.current) {
        console.log('[useSupabaseConnection] Already initialized or reconnecting, skipping initialization');
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
        console.log('[useSupabaseConnection] Removing existing channel');
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channelName = `app-health-${Date.now()}`;
      console.log('[useSupabaseConnection] Creating new channel:', channelName);
      
      channelRef.current = supabase.channel(channelName, {
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

      channelRef.current
        .on('presence', { event: 'sync' }, async () => {
          if (!channelRef.current || isExplicitDisconnectRef.current || !isChannelReady) return;
          
          if (presenceValidationTimeout) {
            clearTimeout(presenceValidationTimeout);
          }

          presenceValidationTimeout = setTimeout(async () => {
            const isValid = await validateChannelPresence(channelRef.current!);
            if (!isValid && !isReconnectingRef.current && !isExplicitDisconnectRef.current) {
              console.warn('[useSupabaseConnection] Invalid presence state detected');
              handleReconnectRef.current?.();
            }
          }, CONNECTION_CONSTANTS.PRESENCE_VALIDATION_DELAY);
        })
        .on('presence', { event: 'join' }, () => {
          if (!isExplicitDisconnectRef.current && isChannelReady) {
            updateLastHeartbeat();
          }
        })
        .on('broadcast', { event: 'heartbeat' }, () => {
          if (!isExplicitDisconnectRef.current && isChannelReady) {
            updateLastHeartbeat();
          }
        });

      await channelRef.current.subscribe(async (status) => {
        console.log('[useSupabaseConnection] Channel status:', status);

        if (status === 'SUBSCRIBED' && !isExplicitDisconnectRef.current) {
          hasInitializedRef.current = true;
          isReconnectingRef.current = false;
          reconnectAttemptsRef.current = 0;
          updateLastHeartbeat();

          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const isValid = await validateChannelPresence(channelRef.current!);
            if (!isValid) {
              throw new Error('Failed to establish presence');
            }

            isChannelReady = true;
            const heartbeatSetup = setupHeartbeat(
              channelRef.current!,
              isExplicitDisconnectRef.current,
              isReconnectingRef.current
            );
            
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
        hasInitializedRef.current = false;
      };

    } catch (error) {
      console.error('[useSupabaseConnection] Channel initialization error:', error);
      if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
        handleReconnectRef.current?.();
      }
      return () => {
        hasInitializedRef.current = false;
      };
    }
  }, [
    releaseWakeLock,
    setupHeartbeat,
    validateChannelPresence,
    requestWakeLock,
    updateLastHeartbeat
  ]);

  handleReconnectRef.current = async () => {
    if (isExplicitDisconnectRef.current || isReconnectingRef.current) {
      console.log('[useSupabaseConnection] Skipping reconnect - explicit disconnect or already reconnecting');
      return;
    }

    isReconnectingRef.current = true;
    clearIntervals();
    hasInitializedRef.current = false;

    if (reconnectAttemptsRef.current >= CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
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

    const delay = Math.min(
      CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      30000
    );
    
    console.log('[useSupabaseConnection] Attempting reconnection:', {
      attempt: reconnectAttemptsRef.current + 1,
      maxAttempts: CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS,
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
          clearIntervals();
          if (channelRef.current) {
            await supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
          releaseWakeLock();
          hasInitializedRef.current = false;
        } else if (!channelRef.current || channelRef.current.state !== 'joined') {
          console.log('[useSupabaseConnection] Session check: Channel reconnect needed');
          if (!isReconnectingRef.current && !hasInitializedRef.current) {
            await initializeChannel();
          }
        }
      } catch (error) {
        console.error('[useSupabaseConnection] Session check error:', error);
        if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
          handleReconnectRef.current?.();
        }
      }
    }, CONNECTION_CONSTANTS.SESSION_CHECK_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useSupabaseConnection] Page visible');
        if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
          if ((!channelRef.current || channelRef.current.state !== 'joined') && !hasInitializedRef.current) {
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
        clearIntervals();
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        releaseWakeLock();
        hasInitializedRef.current = false;
      }
    });

    return () => {
      mounted = false;
      cleanup();
      clearInterval(sessionCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
      clearIntervals();
      releaseWakeLock();
      hasInitializedRef.current = false;
    };
  }, [clearIntervals, initializeChannel, releaseWakeLock]);

  return channelRef.current;
};
