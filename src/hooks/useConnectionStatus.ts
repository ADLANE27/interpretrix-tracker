
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
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 2000;

  const calculateReconnectDelay = () => {
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
    return Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current),
      32000
    );
  };

  const sendHeartbeat = async () => {
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
    setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
    
    if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
      const delay = calculateReconnectDelay();
      console.log(`[ConnectionStatus] Tentative de reconnexion dans ${delay}ms (tentative ${reconnectAttempts.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      
      toast({
        title: "Connexion perdue",
        description: `Tentative de reconnexion dans ${delay / 1000} secondes...`,
      });

      if (reconnectTimeout.current) {
        window.clearTimeout(reconnectTimeout.current);
      }

      reconnectTimeout.current = window.setTimeout(async () => {
        reconnectAttempts.current++;
        await sendHeartbeat();
      }, delay);
    } else {
      console.log('[ConnectionStatus] Nombre maximum de tentatives de reconnexion atteint');
      toast({
        title: "Erreur de connexion",
        description: "Impossible de rétablir la connexion. Veuillez rafraîchir la page.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
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

    initConnectionStatus();

    // Mettre en place l'intervalle de heartbeat
    heartbeatInterval.current = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Gérer les changements de visibilité de la page
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[ConnectionStatus] Page visible - réinitialisation de la connexion');
        await sendHeartbeat();
      } else {
        console.log('[ConnectionStatus] Page masquée');
        setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

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

    // Nettoyage
    return () => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [interpreterId, toast]);

  return connectionStatus;
};
