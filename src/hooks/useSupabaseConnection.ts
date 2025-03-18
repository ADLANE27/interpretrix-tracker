
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { useWakeLock } from './supabase-connection/useWakeLock';
import { useHeartbeat } from './supabase-connection/useHeartbeat';
import { usePresence } from './supabase-connection/usePresence';
import { useTokenRefresh } from './supabase-connection/useTokenRefresh';
import { useConnectionRecovery } from './supabase-connection/useConnectionRecovery';
import { CONNECTION_CONSTANTS } from './supabase-connection/constants';

export const useSupabaseConnection = () => {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isExplicitDisconnectRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const { validateChannelPresence } = usePresence({
    presenceValidationDelay: CONNECTION_CONSTANTS.PRESENCE_VALIDATION_DELAY
  });

  const { setupHeartbeat, clearIntervals, updateLastHeartbeat } = useHeartbeat({
    heartbeatInterval: CONNECTION_CONSTANTS.HEARTBEAT_INTERVAL,
    heartbeatTimeout: CONNECTION_CONSTANTS.HEARTBEAT_TIMEOUT,
    onHeartbeatFailed: () => handleReconnectRef.current?.()
  });

  const { scheduleTokenRefresh } = useTokenRefresh();

  const { handleReconnect, resetReconnectAttempts, clearReconnectTimeout } = useConnectionRecovery({
    onReconnectStart: () => {
      isReconnectingRef.current = true;
      setConnectionStatus('connecting');
      clearIntervals();
    },
    onReconnectEnd: () => {
      isReconnectingRef.current = false;
      setConnectionStatus('disconnected');
      toast({
        title: "Erreur de connexion",
        description: "La connexion temps réel a été perdue. Veuillez rafraîchir la page.",
        variant: "destructive",
        duration: 0,
      });
    }
  });

  const handleReconnectRef = useRef<() => Promise<void>>();
  
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

      // Schedule token refresh
      scheduleTokenRefresh();

      isExplicitDisconnectRef.current = false;
      
      if (channelRef.current) {
        console.log('[useSupabaseConnection] Removing existing channel');
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setConnectionStatus('connecting');

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

      channelRef.current
        .on('presence', { event: 'sync' }, async () => {
          if (!channelRef.current || isExplicitDisconnectRef.current) return;
          
          if (presenceValidationTimeout) {
            clearTimeout(presenceValidationTimeout);
          }

          presenceValidationTimeout = setTimeout(async () => {
            if (!channelRef.current) return;
            
            const isValid = await validateChannelPresence(channelRef.current);
            if (!isValid && !isReconnectingRef.current && !isExplicitDisconnectRef.current) {
              console.warn('[useSupabaseConnection] Invalid presence state detected');
              handleReconnectRef.current?.();
            }
          }, CONNECTION_CONSTANTS.PRESENCE_VALIDATION_DELAY);
        })
        .on('presence', { event: 'join' }, () => {
          if (!isExplicitDisconnectRef.current) {
            updateLastHeartbeat();
          }
        })
        .on('broadcast', { event: 'heartbeat' }, () => {
          if (!isExplicitDisconnectRef.current) {
            updateLastHeartbeat();
          }
        })
        .on('error', (error) => {
          console.error('[useSupabaseConnection] Channel error:', error);
          if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
            handleReconnectRef.current?.();
          }
        });

      await channelRef.current.subscribe(async (status) => {
        console.log('[useSupabaseConnection] Channel status:', status);

        if (status === 'SUBSCRIBED' && !isExplicitDisconnectRef.current) {
          hasInitializedRef.current = true;
          isReconnectingRef.current = false;
          resetReconnectAttempts();
          updateLastHeartbeat();
          setConnectionStatus('connected');

          try {
            const isValid = await validateChannelPresence(channelRef.current!);
            if (!isValid) {
              throw new Error('Failed to establish presence');
            }

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
          setConnectionStatus('disconnected');
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
      setConnectionStatus('disconnected');
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
    updateLastHeartbeat,
    scheduleTokenRefresh,
    resetReconnectAttempts
  ]);

  handleReconnectRef.current = async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    await handleReconnect(channelRef.current, isReconnectingRef.current, initializeChannel);
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
          setConnectionStatus('disconnected');
        } else if (!channelRef.current || !['SUBSCRIBED', 'JOINED'].includes(channelRef.current.state)) {
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
          if (!channelRef.current || !['SUBSCRIBED', 'JOINED'].includes(channelRef.current.state)) {
            initializeChannel();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        console.log('[useSupabaseConnection] User signed out or deleted');
        isExplicitDisconnectRef.current = true;
        clearIntervals();
        clearReconnectTimeout();
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        releaseWakeLock();
        hasInitializedRef.current = false;
        setConnectionStatus('disconnected');
      }
    });

    return () => {
      mounted = false;
      cleanup();
      clearInterval(sessionCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
      clearIntervals();
      clearReconnectTimeout();
      releaseWakeLock();
      hasInitializedRef.current = false;
    };
  }, [
    clearIntervals,
    initializeChannel,
    releaseWakeLock,
    clearReconnectTimeout
  ]);

  return {
    channel: channelRef.current,
    connectionStatus
  };
};
