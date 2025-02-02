import { useEffect, useRef } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionConfig {
  channel: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
  onEvent: (payload: RealtimePostgresChangesPayload<any>) => void;
}

export const useRealtimeSubscription = (config: SubscriptionConfig) => {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const setupSubscription = () => {
    console.log(`[Realtime] Setting up subscription for ${config.table}`);
    
    try {
      channelRef.current = supabase
        .channel(`${config.channel}-${Date.now()}`)
        .on(
          'postgres_changes' as 'postgres_changes',
          {
            event: config.event,
            schema: config.schema || 'public',
            table: config.table,
            filter: config.filter,
          },
          (payload) => {
            console.log(`[Realtime] Received ${config.event} event for ${config.table}:`, payload);
            config.onEvent(payload);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Subscription status for ${config.table}:`, status);
          
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] Successfully subscribed to ${config.table}`);
            retryCountRef.current = 0;
          }
          
          if (status === 'CHANNEL_ERROR') {
            console.error(`[Realtime] Error in channel for ${config.table}`);
            handleSubscriptionError();
          }
        });
    } catch (error) {
      console.error(`[Realtime] Error setting up subscription for ${config.table}:`, error);
      handleSubscriptionError();
    }
  };

  const handleSubscriptionError = () => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      console.log(`[Realtime] Retrying subscription for ${config.table} (attempt ${retryCountRef.current}/${maxRetries})`);
      
      const delay = Math.pow(2, retryCountRef.current - 1) * 1000;
      setTimeout(() => {
        cleanupSubscription();
        setupSubscription();
      }, delay);
    } else {
      console.error(`[Realtime] Max retries reached for ${config.table}`);
      toast({
        title: "Erreur de synchronisation",
        description: "La synchronisation en temps réel a échoué. Veuillez rafraîchir la page.",
        variant: "destructive",
      });
    }
  };

  const cleanupSubscription = () => {
    if (channelRef.current) {
      console.log(`[Realtime] Cleaning up subscription for ${config.table}`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  useEffect(() => {
    setupSubscription();
    return cleanupSubscription;
  }, [config.channel, config.event, config.table, config.filter]);

  return { cleanupSubscription };
};