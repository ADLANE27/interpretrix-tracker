
import { useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Mission } from '@/types/mission';
import { playNotificationSound } from '@/utils/notificationSound';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';

export const useMissionSubscription = (
  currentUserId: string | null,
  onMissionUpdate: () => void
) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { showNotification, requestPermission } = useBrowserNotification();
  const lastUpdateRef = useRef<number>(0);
  const minUpdateIntervalMs = 2000; // Minimum 2 seconds between updates
  
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Use the enhanced realtime subscription hook
  useRealtimeSubscription(
    {
      event: 'INSERT',
      table: 'interpretation_missions',
      schema: 'public'
    },
    (payload) => {
      console.log('[useMissionSubscription] Mission update received:', payload);
      
      if (!payload.new) {
        console.log('[useMissionSubscription] No new mission data in payload');
        return;
      }

      const mission = payload.new as Mission;

      // Only show notification for missions that this interpreter can potentially accept
      const isAvailableForMission = mission.assigned_interpreter_id === null &&
        mission.notified_interpreters?.includes(currentUserId || '');
      
      if (!isAvailableForMission) {
        console.log('[useMissionSubscription] Mission not available for current interpreter');
        return;
      }

      // Throttle updates
      const now = Date.now();
      if (now - lastUpdateRef.current < minUpdateIntervalMs) {
        console.log('[useMissionSubscription] Update throttled, skipping notification');
        onMissionUpdate(); // Still call the update function
        return;
      }
      
      lastUpdateRef.current = now;

      // Play notification sound
      playNotificationSound();

      const isImmediate = mission.mission_type === 'immediate';
      const title = isImmediate ? "🚨 Nouvelle mission immédiate" : "📅 Nouvelle mission programmée";
      const description = `${mission.source_language} → ${mission.target_language}
                    ${mission.client_name ? `\nClient: ${mission.client_name}` : ''}
                    \nDurée: ${mission.estimated_duration} minutes`;
      
      toast({
        title,
        description,
        variant: isImmediate ? "destructive" : "default",
        duration: isImmediate ? 20000 : 10000,
      });

      // Show browser notification
      showNotification(title, {
        body: description,
        tag: 'new-mission',
        requireInteraction: isImmediate,
      });
      
      onMissionUpdate();
    },
    {
      debugMode: false,
      maxRetries: 3,
      retryInterval: 5000,
      onError: (error) => {
        console.error('[useMissionSubscription] Subscription error:', error);
      }
    }
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMissionSubscription] App became visible');
        onMissionUpdate();
      }
    };

    const handleOnline = () => {
      console.log('[useMissionSubscription] Network connection restored');
      onMissionUpdate();
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      console.log('[useMissionSubscription] Cleaning up event listeners');
      window.removeEventListener("online", handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onMissionUpdate]);
};
