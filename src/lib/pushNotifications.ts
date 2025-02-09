
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from "@/utils/notificationSounds";

async function initializeServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.error('[Notifications] Service Worker not supported');
    throw new Error('Service Worker not supported');
  }

  try {
    // Force HTTPS for service worker registration
    const swUrl = new URL('/sw.js', window.location.origin);
    swUrl.protocol = 'https:';

    const registration = await navigator.serviceWorker.register(swUrl.href, {
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
    
    // Strictly validate mission type
    if (missionData.mission_type !== 'immediate' && missionData.mission_type !== 'scheduled') {
      console.error('[Notifications] Invalid mission type:', missionData.mission_type);
      throw new Error('Invalid mission type');
    }
    
    const options = {
      body: `${missionData.source_language} → ${missionData.target_language} - ${missionData.estimated_duration} minutes`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: missionData,
      vibrate: [200],
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

    // Play sound based on mission type - simplified approach
    try {
      console.log('[Notifications] Playing sound for mission type:', missionData.mission_type);
      await playNotificationSound(missionData.mission_type);
    } catch (soundError) {
      console.error('[Notifications] Error playing sound:', soundError);
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

    // Force permission request on user interaction
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.error('[Notifications] Permission denied');
      throw new Error('Notification permission denied');
    }

    // Pre-initialize sounds
    try {
      await Promise.all([
        playNotificationSound('immediate', true),
        playNotificationSound('scheduled', true)
      ]);
      console.log('[Notifications] Sounds pre-initialized successfully');
    } catch (error) {
      console.error('[Notifications] Error pre-initializing sounds:', error);
    }
    
    // Subscribe to mission notifications with simplified approach
    const channel = supabase.channel('mission-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen for new missions
          schema: 'public',
          table: 'mission_notifications',
          filter: `interpreter_id=eq.${interpreterId}`
        },
        async (payload) => {
          console.log('[Notifications] New mission notification received:', payload);
          
          try {
            const { data: mission, error } = await supabase
              .from('interpretation_missions')
              .select('*')
              .eq('id', payload.new.mission_id)
              .maybeSingle();

            if (error) {
              console.error('[Notifications] Error fetching mission:', error);
              return;
            }

            if (!mission) {
              console.error('[Notifications] No mission found for id:', payload.new.mission_id);
              return;
            }

            await showNotification(mission);
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
