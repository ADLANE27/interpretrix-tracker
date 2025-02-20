
import { useRef, useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Mission } from '@/types/mission';

export const useMissionSubscription = (
  currentUserId: string | null,
  onMissionUpdate: () => void
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectCountRef = useRef(0);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    console.log('[useMissionSubscription] Setting up subscription');
    
    const initializeChannel = () => {
      try {
        if (channelRef.current) {
          console.log('[useMissionSubscription] Removing existing channel');
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        supabase.realtime.disconnect();
        
        setTimeout(() => {
          channelRef.current = supabase
            .channel('interpreter-missions')
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'interpretation_missions'
              },
              (payload) => {
                console.log('[useMissionSubscription] Mission update received:', payload);
                
                if (!payload.new) {
                  console.log('[useMissionSubscription] No new mission data in payload');
                  return;
                }

                const mission = payload.new as Mission;
                
                if (!mission.notified_interpreters?.includes(currentUserId || '')) {
                  console.log('[useMissionSubscription] Current user not in notified interpreters');
                  return;
                }

                const isImmediate = mission.mission_type === 'immediate';
                
                if (!isMobile) {
                  console.log('[useMissionSubscription] Showing toast for new mission');
                  toast({
                    title: isImmediate ? "🚨 Nouvelle mission immédiate" : "📅 Nouvelle mission programmée",
                    description: `${mission.source_language} → ${mission.target_language} - ${mission.estimated_duration} minutes`,
                    variant: isImmediate ? "destructive" : "default",
                    duration: 10000,
                  });
                }
                
                onMissionUpdate();
              }
            )
            .subscribe(async (status) => {
              console.log('[useMissionSubscription] Subscription status:', status);
              
              if (status === 'SUBSCRIBED') {
                console.log('[useMissionSubscription] Successfully subscribed to changes');
                reconnectCountRef.current = 0;
                if (visibilityTimeoutRef.current) {
                  clearTimeout(visibilityTimeoutRef.current);
                }
              }
            });
        }, 1000);
      } catch (error) {
        console.error('[useMissionSubscription] Error in initializeChannel:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMissionSubscription] App became visible');
        
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
        }
        
        visibilityTimeoutRef.current = setTimeout(() => {
          console.log('[useMissionSubscription] Reinitializing after visibility change');
          try {
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
            supabase.realtime.disconnect();
          } catch (error) {
            console.error('[useMissionSubscription] Error during cleanup:', error);
          }
          
          reconnectCountRef.current = 0;
          setTimeout(initializeChannel, 1000);
          onMissionUpdate();
        }, 1000);
      }
    };

    window.addEventListener("online", handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    initializeChannel();

    return () => {
      console.log('[useMissionSubscription] Cleaning up subscription');
      window.removeEventListener("online", handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
      try {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
        supabase.realtime.disconnect();
      } catch (error) {
        console.error('[useMissionSubscription] Error during final cleanup:', error);
      }
    };
  }, [currentUserId, onMissionUpdate, toast, isMobile]);
};
