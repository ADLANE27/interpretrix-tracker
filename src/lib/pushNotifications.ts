
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

    // Unregister any existing service workers first
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[Notifications] Unregistered existing service worker');
    }

    const registration = await navigator.serviceWorker.register(swUrl.href, {
      type: 'module',
      updateViaCache: 'none',
      scope: '/'
    });
    console.log('[Notifications] ServiceWorker registered:', registration);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('[Notifications] ServiceWorker is ready');

    return registration;
  } catch (error) {
    console.error('[Notifications] ServiceWorker registration failed:', error);
    throw error;
  }
}

async function getVapidPublicKey() {
  try {
    console.log('[Notifications] Fetching VAPID public key');
    const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
    
    if (error) {
      console.error('[Notifications] Error fetching VAPID key:', error);
      throw error;
    }

    if (!data?.vapidPublicKey) {
      console.error('[Notifications] No VAPID key returned');
      throw new Error('No VAPID key returned');
    }

    console.log('[Notifications] Successfully retrieved VAPID key');
    return data.vapidPublicKey;
  } catch (error) {
    console.error('[Notifications] Failed to get VAPID key:', error);
    throw error;
  }
}

async function subscribeToPushNotifications(registration: ServiceWorkerRegistration, interpreterId: string) {
  try {
    console.log('[Notifications] Starting push subscription process');
    
    // Get existing subscription first
    let subscription = await registration.pushManager.getSubscription();
    
    // If there's an existing subscription, unsubscribe first
    if (subscription) {
      console.log('[Notifications] Found existing subscription, unsubscribing');
      await subscription.unsubscribe();
    }

    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    
    // Convert VAPID key to Uint8Array
    const vapidKeyBuffer = Uint8Array.from(atob(vapidPublicKey), c => c.charCodeAt(0));

    console.log('[Notifications] Requesting new push subscription');
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyBuffer
    });

    console.log('[Notifications] Push subscription successful:', subscription);

    // Store subscription in Supabase
    const { error: insertError } = await supabase
      .from('push_subscriptions')
      .insert({
        interpreter_id: interpreterId,
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode.apply(null, 
          new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode.apply(null, 
          new Uint8Array(subscription.getKey('auth')))),
        user_agent: navigator.userAgent,
        status: 'active'
      });

    if (insertError) {
      console.error('[Notifications] Error storing subscription:', insertError);
      throw insertError;
    }

    console.log('[Notifications] Subscription stored successfully');
    return subscription;
  } catch (error) {
    console.error('[Notifications] Push subscription failed:', error);
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

    // Play sound based on mission type
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
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.error('[Notifications] Notifications not supported');
      throw new Error('Notifications not supported');
    }

    // Request notification permission early
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.error('[Notifications] Permission denied');
      throw new Error('Notification permission denied');
    }

    // Initialize service worker and wait for it to be ready
    const registration = await initializeServiceWorker();
    
    // Subscribe to push notifications
    await subscribeToPushNotifications(registration, interpreterId);

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
