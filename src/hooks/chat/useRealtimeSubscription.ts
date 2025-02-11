
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SubscriptionOptions {
  channelName: string;
  tableToWatch: string;
  eventTypes?: ('INSERT' | 'UPDATE' | 'DELETE')[];
  filter?: string;
  filterValue?: string | number;
}

const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const MAX_RETRIES = 5;

export const useRealtimeSubscription = ({
  channelName,
  tableToWatch,
  eventTypes = ['INSERT', 'UPDATE', 'DELETE'],
  filter,
  filterValue,
}: SubscriptionOptions) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);

  const clearRetryTimeout = () => {
    if (retryTimeoutRef.current !== null) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const updateSubscriptionStatus = useCallback(async (status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
      };

      await supabase
        .from('subscription_status')
        .upsert({
          user_id: user.id,
          current_status: status,
          device_info: deviceInfo,
          channel_ids: [channelName],
          last_successful_connection: status === 'connected' ? new Date().toISOString() : undefined,
          retry_count: retryCountRef.current,
        }, {
          onConflict: 'user_id',
        });
    } catch (error) {
      console.error('[useRealtimeSubscription] Error updating status:', error);
    }
  }, [channelName]);

  const handleVisibilityChange = useCallback(() => {
    if (!channelRef.current) return;

    if (document.visibilityState === 'visible') {
      console.log('[useRealtimeSubscription] Document visible, resubscribing...');
      channelRef.current.subscribe();
      updateSubscriptionStatus('reconnecting');
    } else {
      console.log('[useRealtimeSubscription] Document hidden, unsubscribing...');
      channelRef.current.unsubscribe();
      updateSubscriptionStatus('disconnected');
    }
  }, [updateSubscriptionStatus]);

  const setupChannel = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    console.log('[useRealtimeSubscription] Setting up channel:', channelName);

    const changes = {
      schema: 'public',
      table: tableToWatch,
      event: '*',
      ...(filter && filterValue ? { filter: `${filter}=eq.${filterValue}` } : {}),
    };

    channelRef.current = supabase.channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        console.log('[useRealtimeSubscription] Channel synced');
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('[useRealtimeSubscription] Join event:', key);
      })
      .on('system', { event: '*' }, (payload) => {
        console.log('[useRealtimeSubscription] System event:', payload);
      })
      .on(
        'postgres_changes',
        changes,
        (payload) => {
          console.log('[useRealtimeSubscription] DB change:', payload);
          // Les composants qui utilisent ce hook peuvent accéder aux événements via leur propre callback
        }
      )
      .subscribe(async (status) => {
        console.log('[useRealtimeSubscription] Subscription status:', status);

        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
          retryCountRef.current = 0;
          clearRetryTimeout();
          await updateSubscriptionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError(new Error('Connection error'));
          await updateSubscriptionStatus('error');
          
          if (retryCountRef.current < MAX_RETRIES) {
            const delay = Math.min(
              INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current),
              MAX_RETRY_DELAY
            );
            
            console.log(`[useRealtimeSubscription] Retrying in ${delay}ms (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`);
            
            retryTimeoutRef.current = window.setTimeout(() => {
              retryCountRef.current++;
              setupChannel();
            }, delay);
          } else {
            console.error('[useRealtimeSubscription] Max retries reached');
            toast({
              title: "Erreur de connexion",
              description: "Impossible de se reconnecter après plusieurs tentatives",
              variant: "destructive",
            });
          }
        }
      });

  }, [channelName, tableToWatch, filter, filterValue, toast, updateSubscriptionStatus]);

  useEffect(() => {
    setupChannel();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[useRealtimeSubscription] Cleaning up subscription');
      clearRetryTimeout();
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setupChannel, handleVisibilityChange]);

  return {
    isConnected,
    error,
    retryCount: retryCountRef.current,
  };
};
