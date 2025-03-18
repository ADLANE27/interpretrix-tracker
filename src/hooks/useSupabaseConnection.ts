
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { useWakeLock } from './supabase-connection/useWakeLock';
import { useHeartbeat } from './supabase-connection/useHeartbeat';
import { usePresence } from './supabase-connection/usePresence';
import { useTokenRefresh } from './supabase-connection/useTokenRefresh';
import { useConnectionRecovery } from './supabase-connection/useConnectionRecovery';
import { useChannelInitialization } from './supabase-connection/useChannelInitialization';
import { useSessionManagement } from './supabase-connection/useSessionManagement';
import { CONNECTION_CONSTANTS } from './supabase-connection/constants';

export const useSupabaseConnection = () => {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isExplicitDisconnectRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  const { releaseWakeLock } = useWakeLock();
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
  
  const { setupChannelSubscription } = useChannelInitialization({
    onChannelError: () => {
      if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
        handleReconnectRef.current?.();
      }
    },
    handleReconnect: () => handleReconnectRef.current?.(),
    isExplicitDisconnect: isExplicitDisconnectRef.current,
    isReconnecting: isReconnectingRef.current,
    setConnectionStatus,
    updateLastHeartbeat,
    setupHeartbeat,
    validateChannelPresence
  });

  const { checkSession } = useSessionManagement({
    isExplicitDisconnect: isExplicitDisconnectRef.current,
    isReconnecting: isReconnectingRef.current,
    hasInitialized: hasInitializedRef.current,
    onSessionInvalid: () => {
      isExplicitDisconnectRef.current = true;
      clearIntervals();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      releaseWakeLock();
      hasInitializedRef.current = false;
      setConnectionStatus('disconnected');
    },
    onSessionValid: () => {
      if (!channelRef.current || !['SUBSCRIBED', 'JOINED'].includes(channelRef.current.state)) {
        if (!isReconnectingRef.current && !hasInitializedRef.current) {
          initializeChannel();
        }
      }
    }
  });

  const initializeChannel = useCallback(async () => {
    try {
      if (isReconnectingRef.current || hasInitializedRef.current) {
        console.log('[useSupabaseConnection] Already initialized or reconnecting, skipping initialization');
        return;
      }

      console.log('[useSupabaseConnection] Initializing channel');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[useSupabaseConnection] No active session, skipping connection');
        releaseWakeLock();
        return;
      }

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

      await setupChannelSubscription(channelRef.current);
      hasInitializedRef.current = true;
      isReconnectingRef.current = false;
      resetReconnectAttempts();
      updateLastHeartbeat();

    } catch (error) {
      console.error('[useSupabaseConnection] Channel initialization error:', error);
      setConnectionStatus('disconnected');
      if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
        handleReconnectRef.current?.();
      }
    }
  }, [
    releaseWakeLock,
    setupChannelSubscription,
    scheduleTokenRefresh,
    resetReconnectAttempts,
    updateLastHeartbeat
  ]);

  handleReconnectRef.current = async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    await handleReconnect(
      channelRef.current,
      false,
      initializeChannel
    );
  };

  useEffect(() => {
    let cleanup: () => void = () => {};

    const setup = async () => {
      await initializeChannel();
    };

    setup();

    const sessionCheckInterval = setInterval(async () => {
      await checkSession();
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
      if (event === 'SIGNED_OUT') {
        console.log('[useSupabaseConnection] User signed out');
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
    clearReconnectTimeout,
    checkSession
  ]);

  return {
    channel: channelRef.current,
    connectionStatus
  };
};
