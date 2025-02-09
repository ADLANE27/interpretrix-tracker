
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from "@/utils/notificationSounds";

// Initialize service worker early
async function initializeServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.error('[Notifications] Service Worker not supported');
    throw new Error('Service Worker not supported');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      type: 'module',
      updateViaCache: 'none',
      scope: '/'
    });
    console.log('[Notifications] ServiceWorker registered:', registration);
    return registration;
  } catch (error) {
    console.error('[Notifications] ServiceWorker registration failed:', error);
    throw error;
  }
}

async function showNotification(missionData: any) {
  try {
    // Verify notification permission first
    if (Notification.permission !== 'granted') {
      console.error('[Notifications] Permission not granted');
      throw new Error('Notification permission not granted');
    }

    const registration = await navigator.serviceWorker.ready;
    console.log('[Notifications] Showing notification for mission:', missionData);
    
    // Explicitly validate mission type
    const validatedMissionType = missionData.mission_type === 'immediate' ? 'immediate' : 'scheduled';
    
    const options = {
      body: `${missionData.source_language} → ${missionData.target_language} - ${missionData.estimated_duration} minutes`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { ...missionData, mission_type: validatedMissionType },
      vibrate: /android/i.test(navigator.userAgent) ? [100, 50, 100] : [200, 100, 200],
      tag: `mission-${validatedMissionType}-${missionData.id}`,
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
      validatedMissionType === 'immediate' ? 
        '🚨 Nouvelle mission immédiate' : 
        '📅 Nouvelle mission programmée',
      options
    );

    // Play sound based on validated mission type
    try {
      console.log('[Notifications] Playing sound for mission type:', validatedMissionType);
      await playNotificationSound(validatedMissionType);
    } catch (soundError) {
      console.error('[Notifications] Error playing sound:', soundError);
      // Don't throw here - we still want to show the notification even if sound fails
    }

  } catch (error) {
    console.error('[Notifications] Error showing notification:', error);
    throw error;
  }
}

export async function setupNotifications(interpreterId: string) {
  try {
    console.log('[Notifications] Setting up notifications for interpreter:', interpreterId);
    
    // Pre-initialize service worker
    await initializeServiceWorker();
    
    // Request notification permission early
    if (!('Notification' in window)) {
      console.error('[Notifications] Notifications not supported');
      throw new Error('Notifications not supported');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.error('[Notifications] Permission denied');
      throw new Error('Notification permission denied');
    }

    // Pre-initialize sounds with better error handling
    try {
      await Promise.all([
        playNotificationSound('immediate', true),
        playNotificationSound('scheduled', true)
      ]);
      console.log('[Notifications] Sounds pre-initialized successfully');
    } catch (error) {
      console.error('[Notifications] Error pre-initializing sounds:', error);
      // Continue setup even if sound initialization fails
    }
    
    // Subscribe to mission notifications with better error handling
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
          console.log('[Notifications] New mission notification received:', payload);
          
          try {
            if (payload.new.status === 'pending') {
              const { data: mission, error } = await supabase
                .from('interpretation_missions')
                .select('*')
                .eq('id', payload.new.mission_id)
                .single();

              if (error) {
                console.error('[Notifications] Error fetching mission:', error);
                return;
              }

              if (!mission) {
                console.error('[Notifications] No mission found for id:', payload.new.mission_id);
                return;
              }

              await showNotification(mission);
            }
          } catch (error) {
            console.error('[Notifications] Error processing notification:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Notifications] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[Notifications] Successfully subscribed to changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Notifications] Error subscribing to changes');
        }
      });

    return () => {
      console.log('[Notifications] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error('[Notifications] Error setting up notifications:', error);
    throw error;
  }
}
