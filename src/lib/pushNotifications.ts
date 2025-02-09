
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from "@/utils/notificationSounds";

function initializeServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.error('[Notifications] Service Worker not supported in this browser');
    throw new Error('Service Worker not supported');
  }

  return navigator.serviceWorker.register('/sw.js', {
    type: 'module',
    updateViaCache: 'none'
  });
}

async function showNotification(missionData: any) {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    const options = {
      body: `${missionData.source_language} → ${missionData.target_language} - ${missionData.estimated_duration} minutes`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: missionData,
      vibrate: /android/i.test(navigator.userAgent) ? [100, 50, 100] : [200, 100, 200],
      tag: `mission-${missionData.mission_type}-${missionData.id}`,
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'accept', title: '✓' },
        { action: 'decline', title: '✗' }
      ],
      silent: false,
      timestamp: Date.now()
    };

    await registration.showNotification(
      missionData.mission_type === 'immediate' ? 
        '🚨 Nouvelle mission immédiate' : 
        '📅 Nouvelle mission programmée',
      options
    );

    // Play sound based on mission type
    await playNotificationSound(missionData.mission_type);

  } catch (error) {
    console.error('[Notifications] Error showing notification:', error);
    throw error;
  }
}

export async function setupNotifications(interpreterId: string) {
  try {
    console.log('[Notifications] Setting up notifications for interpreter:', interpreterId);
    
    // Request notification permission
    if (!('Notification' in window)) {
      console.error('[Notifications] Notifications not supported');
      throw new Error('Notifications not supported');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.error('[Notifications] Permission denied');
      throw new Error('Notification permission denied');
    }

    // Initialize service worker
    await initializeServiceWorker();
    
    // Subscribe to mission notifications
    const channel = supabase.channel('mission-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mission_notifications',
          filter: `interpreter_id=eq.${interpreterId}`
        },
        async (payload) => {
          console.log('[Notifications] New mission notification:', payload);
          
          if (payload.new.status === 'pending') {
            // Get mission details
            const { data: mission, error } = await supabase
              .from('interpretation_missions')
              .select('*')
              .eq('id', payload.new.mission_id)
              .single();

            if (error) {
              console.error('[Notifications] Error fetching mission:', error);
              return;
            }

            await showNotification(mission);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Notifications] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error('[Notifications] Error setting up notifications:', error);
    throw error;
  }
}
