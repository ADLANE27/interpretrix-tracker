
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const HEARTBEAT_INTERVAL = 30000; // 30 secondes
const INACTIVITY_TIMEOUT = 300000; // 5 minutes

interface ConnectionStatus {
  isOnline: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'inactive';
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
  const inactivityTimeout = useRef<number>();
  const lastActivityTime = useRef(new Date());

  const updateLastActivity = () => {
    lastActivityTime.current = new Date();
  };

  const handleInactivity = async () => {
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - lastActivityTime.current.getTime();

    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
      console.log('[ConnectionStatus] Utilisateur inactif depuis 5 minutes');
      setConnectionStatus(prev => ({ ...prev, status: 'inactive' }));
      
      try {
        await supabase
          .from('interpreter_connection_status')
          .upsert({
            interpreter_id: interpreterId,
            is_online: false,
            connection_status: 'inactive',
            last_seen_at: new Date().toISOString(),
          });
      } catch (error) {
        console.error('[ConnectionStatus] Erreur lors de la mise à jour du statut inactif:', error);
      }
    }
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

      setConnectionStatus({
        isOnline: true,
        status: 'connected',
        lastHeartbeat: new Date(),
      });
    } catch (error) {
      console.error('[ConnectionStatus] Erreur lors du heartbeat:', error);
      setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
      
      toast({
        title: "Connexion perdue",
        description: "Tentative de reconnexion en cours...",
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
      }
    };

    initConnectionStatus();

    // Mettre en place les écouteurs d'événements pour détecter l'activité
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, updateLastActivity);
    });

    // Mettre en place les intervalles de vérification
    heartbeatInterval.current = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    inactivityTimeout.current = window.setInterval(handleInactivity, 60000); // Vérifier l'inactivité toutes les minutes

    // Gérer les changements de visibilité de la page
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[ConnectionStatus] Page visible - réinitialisation de la connexion');
        updateLastActivity();
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
      if (inactivityTimeout.current) clearInterval(inactivityTimeout.current);
      events.forEach(event => {
        document.removeEventListener(event, updateLastActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [interpreterId, toast]);

  return connectionStatus;
};
