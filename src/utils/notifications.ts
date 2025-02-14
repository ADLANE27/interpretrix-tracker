
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('[Notifications] Browser does not support notifications');
    return false;
  }

  try {
    console.log('[Notifications] Requesting permission...');
    const permission = await Notification.requestPermission();
    console.log('[Notifications] Permission result:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('[Notifications] Error requesting permission:', error);
    return false;
  }
};

export const showNotification = (title: string, options?: NotificationOptions) => {
  if (!('Notification' in window)) {
    console.log('[Notifications] Browser does not support notifications');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.log('[Notifications] No permission to show notifications');
    return;
  }

  try {
    new Notification(title, options);
    console.log('[Notifications] Notification shown:', { title, options });
  } catch (error) {
    console.error('[Notifications] Error showing notification:', error);
  }
};

