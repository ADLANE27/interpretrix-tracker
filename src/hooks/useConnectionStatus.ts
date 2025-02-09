
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const HEARTBEAT_INTERVAL = 30000; // 30 secondes

interface ConnectionStatus {
  isOnline: boolean;
  status: 'connected' | 'connecting' | 'disconnected';
  lastHeartbeat: Date;
}

export const useConnectionStatus = (interpreterId: string) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: false,
    status: 'connecting',
    lastHeartbeat: new Date(),
  });
  const { toast } = useToast();
  const heartbeatInterval = useRef<number>();
  const reconnectTimeout = useRef<number>();
  const reconnectAttempts = useRef(0);
  const BASE_RECONNECT_DELAY = 2000;

  const calculateReconnectDelay = () => {
    return BASE_RECONNECT_DELAY;
  };

  const sendHeartbeat = async () => {
    // Skip if no interpreter ID is provided
    if (!interpreterId) {
      console.log('[ConnectionStatus] No interpreter ID provided, skipping heartbeat');
      return;
    }

    try {
      console.log('[ConnectionStatus] Envoi du heartbeat');
      const { error } = await supabase
        .from('interpreter_connection_status')
        .upsert({
          interpreter_id: interpreterId,
          is_online: true,
          connection_status: 'connected',
          last_heartbeat: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        });

      if (error) throw error;

      reconnectAttempts.current = 0;
      setConnectionStatus({
        isOnline: true,
        status: 'connected',
        lastHeartbeat: new Date(),
      });
    } catch (error) {
      console.error('[ConnectionStatus] Erreur lors du heartbeat:', error);
      handleConnectionError();
    }
  };

  const handleConnectionError = () => {
    setConnectionStatus(prev => ({ ...prev, status: 'connecting' }));
    
    const delay = calculateReconnectDelay();
    console.log(`[ConnectionStatus] Tentative de reconnexion dans ${delay}ms`);
    
    if (reconnectTimeout.current) {
      window.clearTimeout(reconnectTimeout.current);
    }

    reconnectTimeout.current = window.setTimeout(async () => {
      reconnectAttempts.current++;
      await sendHeartbeat();
    }, delay);
  };

  useEffect(() => {
    // Skip initialization if no interpreter ID is provided
    if (!interpreterId) {
      console.log('[ConnectionStatus] No interpreter ID provided, skipping initialization');
      return;
    }

    // Initialiser le statut de connexion
    const initConnectionStatus = async () => {
      try {
        const { error } = await supabase
          .from('interpreter_connection_status')
          .upsert({
            interpreter_id: interpreterId,
            is_online: true,
            connection_status: 'connected',
            last_heartbeat: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          });

        if (error) throw error;

        setConnectionStatus({
          isOnline: true,
          status: 'connected',
          lastHeartbeat: new Date(),
        });
      } catch (error) {
        console.error('[ConnectionStatus] Erreur lors de l\'initialisation:', error);
        handleConnectionError();
      }
    };

    console.log('[ConnectionStatus] Initialisation de la connexion persistante');
    initConnectionStatus();

    // Mettre en place l'intervalle de heartbeat
    heartbeatInterval.current = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Configuration de la souscription aux changements en temps réel
    const channel = supabase
      .channel('interpreter-connection-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpreter_connection_status',
          filter: `interpreter_id=eq.${interpreterId}`,
        },
        (payload) => {
          console.log('[ConnectionStatus] Mise à jour du statut reçue:', payload);
        }
      )
      .subscribe();

    // Activer le wake lock si disponible
    const enableWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          await (navigator as any).wakeLock.request('screen');
          console.log('[ConnectionStatus] Wake lock activé');
        } catch (err) {
          console.log('[ConnectionStatus] Wake lock non disponible:', err);
        }
      }
    };
    enableWakeLock();

    // Nettoyage
    return () => {
      console.log('[ConnectionStatus] Nettoyage de la connexion');
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      supabase.removeChannel(channel);
    };
  }, [interpreterId, toast]);

  return connectionStatus;
};
