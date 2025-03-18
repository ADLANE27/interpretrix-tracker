
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { useChannelInitialization } from './supabase-connection/useChannelInitialization';
import { CONNECTION_CONSTANTS } from './supabase-connection/constants';

export const useSupabaseConnection = () => {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isExplicitDisconnectRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const lastHeartbeatRef = useRef<number>(Date.now());

  const updateLastHeartbeat = useCallback(() => {
    lastHeartbeatRef.current = Date.now();
  }, []);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, []);

  const handleReconnect = useCallback(async (channel: RealtimeChannel | null): Promise<void> => {
    clearReconnectTimeout();
    isReconnectingRef.current = true;
    setConnectionStatus('connecting');

    if (reconnectAttemptsRef.current >= CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      console.error('[useSupabaseConnection] Max reconnection attempts reached');
      isReconnectingRef.current = false;
      setConnectionStatus('disconnected');
      toast({
        title: "Erreur de connexion",
        description: "La connexion temps réel a été perdue. Veuillez rafraîchir la page.",
        variant: "destructive",
      });
      return;
    }

    const delay = Math.min(
      CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      30000
    );
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      reconnectAttemptsRef.current++;
      try {
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        await initializeChannel();
      } catch (error) {
        console.error('[useSupabaseConnection] Reconnection attempt failed:', error);
        handleReconnect(null);
      }
    }, delay);
  }, [clearReconnectTimeout, toast]);

  const { setupChannelSubscription } = useChannelInitialization({
    onChannelError: () => {
      if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
        handleReconnect(channelRef.current);
      }
    },
    handleReconnect,
    isExplicitDisconnect: isExplicitDisconnectRef.current,
    isReconnecting: isReconnectingRef.current,
    setConnectionStatus,
    updateLastHeartbeat
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
        return;
      }

      isExplicitDisconnectRef.current = false;
      
      if (channelRef.current) {
        console.log('[useSupabaseConnection] Removing existing channel');
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setConnectionStatus('connecting');

      const channelName = `app-health-${Date.now()}`;
      console.log('[useSupabaseConnection] Creating new channel:', channelName);
      
      channelRef.current = supabase.channel(channelName);

      if (!channelRef.current) {
        throw new Error('Failed to create channel');
      }

      await setupChannelSubscription(channelRef.current);
      hasInitializedRef.current = true;
      isReconnectingRef.current = false;
      reconnectAttemptsRef.current = 0;
      updateLastHeartbeat();

    } catch (error) {
      console.error('[useSupabaseConnection] Channel initialization error:', error);
      setConnectionStatus('disconnected');
      if (!isExplicitDisconnectRef.current && !isReconnectingRef.current) {
        handleReconnect(null);
      }
    }
  }, [
    setupChannelSubscription,
    updateLastHeartbeat,
    handleReconnect
  ]);

  useEffect(() => {
    let cleanup: () => void = () => {};

    const setup = async () => {
      await initializeChannel();
    };

    setup();

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
        clearReconnectTimeout();
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        hasInitializedRef.current = false;
        setConnectionStatus('disconnected');
      }
    });

    return () => {
      cleanup();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
      clearReconnectTimeout();
    };
  }, [
    initializeChannel,
    clearReconnectTimeout,
  ]);

  return {
    channel: channelRef.current,
    connectionStatus
  };
};
