
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
        channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: new Date().toISOString() }
        });
      }
    }, 30000);

    return heartbeatInterval;
  };

  const initializeChannel = () => {
    try {
      console.log('[useSupabaseConnection] Initializing realtime connection...');
      
      // Nettoyer l'ancien canal si il existe
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Créer un nouveau canal avec un heartbeat
      channelRef.current = supabase.channel('app-health', {
        config: {
          broadcast: { ack: true },
          presence: { key: 'status' }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        console.log('[useSupabaseConnection] Presence sync state:', channelRef.current?.presenceState());
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

          // Tracker la présence
          await channelRef.current?.track({
            online_at: new Date().toISOString(),
            status: 'online'
          });
        }

        if (status === 'CHANNEL_ERROR') {
          console.error('[useSupabaseConnection] Channel error, attempting to reconnect...');
          handleReconnect();
        }

        if (status === 'TIMED_OUT') {
          console.error('[useSupabaseConnection] Connection timed out, attempting to reconnect...');
          handleReconnect();
        }
      });

      // Configurer le heartbeat
      const heartbeatInterval = setupHeartbeat(channelRef.current);

      return () => {
        clearInterval(heartbeatInterval);
      };
    } catch (error) {
      console.error('[useSupabaseConnection] Error initializing channel:', error);
      handleReconnect();
    }
  };

  const handleReconnect = () => {
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
  };

  useEffect(() => {
    const cleanup = initializeChannel();

    // Gérer les changements de visibilité de la page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useSupabaseConnection] Page became visible, reinitializing connection...');
        initializeChannel();
      }
    };

    // Gérer les changements de connexion réseau
    const handleOnline = () => {
      console.log('[useSupabaseConnection] Network connection restored');
      initializeChannel();
    };

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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return channelRef.current;
};
