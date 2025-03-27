
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Mission } from '@/types/mission';
import { playNotificationSound } from '@/utils/notificationSound';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { useRealtime } from '@/context/RealtimeContext';

export const useMissionSubscription = (
  currentUserId: string | null,
  onMissionUpdate: () => void
) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { showNotification, requestPermission } = useBrowserNotification();
  const { subscribe } = useRealtime();
  
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Use the centralized realtime context
  useEffect(() => {
    // Only subscribe when we have a current user ID
    if (!currentUserId) return;
    
    const unsubscribe = subscribe(
      {
        event: 'INSERT',
        table: 'interpretation_missions',
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
      }
    );
    
    return unsubscribe;
  }, [subscribe, currentUserId, toast, showNotification, onMissionUpdate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMissionSubscription] App became visible');
        onMissionUpdate();
      }
    };

    window.addEventListener("online", handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      console.log('[useMissionSubscription] Cleaning up event listeners');
      window.removeEventListener("online", handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onMissionUpdate]);
};
