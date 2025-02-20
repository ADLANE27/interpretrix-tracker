
export const checkPushNotificationStatus = async () => {
  try {
    console.log('[pushNotifications] Checking status...');
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('[pushNotifications] Notifications not supported');
      return { enabled: false, permission: 'unsupported' };
    }

    // Get current permission status
    const permission = Notification.permission;
    console.log('[pushNotifications] Current permission:', permission);

    // Check if service worker is registered
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    console.log('[pushNotifications] Current subscription:', subscription);

    // Check if subscription is still valid
    if (subscription) {
      try {
        // Test if the subscription is still valid
        await subscription.getKey('p256dh');
      } catch (error) {
        console.log('[pushNotifications] Invalid subscription, removing it');
        await subscription.unsubscribe();
        return { enabled: false, permission, subscription: null };
      }
    }

    return {
      enabled: permission === 'granted' && !!subscription,
      permission,
      subscription
    };
  } catch (error) {
    console.error('[pushNotifications] Status check error:', error);
    return {
      enabled: false,
      permission: Notification.permission,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};
