
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
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for notifications
    audioRef.current = new Audio('/notification-sound.mp3'); // You'll need to add this sound file
    
    console.log('[useMissionSubscription] Setting up subscription');
    let isSubscribed = true;
    
    const initializeChannel = () => {
      try {
        if (channelRef.current) {
          console.log('[useMissionSubscription] Removing existing channel');
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        const channelName = `interpreter-missions-${Date.now()}`;
        console.log('[useMissionSubscription] Creating new channel:', channelName);
        
        channelRef.current = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'interpretation_missions'
            },
            (payload) => {
              if (!isSubscribed) return;
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
              try {
                audioRef.current?.play().catch(e => console.error('Error playing notification:', e));
              } catch (error) {
                console.error('Error playing notification sound:', error);
              }

              const isImmediate = mission.mission_type === 'immediate';
              
              // Show toast notification on both mobile and desktop
              toast({
                title: isImmediate ? "🚨 Nouvelle mission immédiate" : "📅 Nouvelle mission programmée",
                description: `${mission.source_language} → ${mission.target_language}
                            ${mission.client_name ? `\nClient: ${mission.client_name}` : ''}
                            \nDurée: ${mission.estimated_duration} minutes`,
                variant: isImmediate ? "destructive" : "default",
                duration: isImmediate ? 20000 : 10000, // Longer duration for immediate missions
              });
              
              onMissionUpdate();
            }
          )
          .subscribe((status) => {
            console.log('[useMissionSubscription] Subscription status:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('[useMissionSubscription] Successfully subscribed to changes');
            }
          });
      } catch (error) {
        console.error('[useMissionSubscription] Error in initializeChannel:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMissionSubscription] App became visible');
        onMissionUpdate();
      }
    };

    window.addEventListener("online", handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial setup
    initializeChannel();

    // Cleanup function
    return () => {
      console.log('[useMissionSubscription] Cleaning up subscription');
      isSubscribed = false;
      window.removeEventListener("online", handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (channelRef.current) {
        console.log('[useMissionSubscription] Removing channel');
        supabase.removeChannel(channelRef.current)
          .catch(error => {
            console.error('[useMissionSubscription] Error during cleanup:', error);
          });
      }
    };
  }, [currentUserId, onMissionUpdate, toast, isMobile]);
};
