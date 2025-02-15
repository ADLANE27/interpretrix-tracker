
// Function to check if notifications are supported
export const isNotificationsSupported = () => {
  return 'Notification' in window;
};

// Function to get current browser permission
export const getNotificationPermission = () => {
  if (!isNotificationsSupported()) return 'denied';
  return Notification.permission;
};

// Function to get saved notification preference
export const getSavedNotificationPreference = () => {
  return localStorage.getItem('notificationsEnabled') === 'true';
};

// Function to save notification preference
export const saveNotificationPreference = (enabled: boolean) => {
  localStorage.setItem('notificationsEnabled', enabled.toString());
};

export const requestNotificationPermission = async () => {
  if (!isNotificationsSupported()) {
    console.log('[Notifications] Browser does not support notifications');
    return false;
  }

  try {
    console.log('[Notifications] Current permission:', Notification.permission);
    if (Notification.permission === 'denied') {
      console.log('[Notifications] Permission already denied');
      return false;
    }

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
  if (!isNotificationsSupported()) {
    console.log('[Notifications] Browser does not support notifications');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.log('[Notifications] No permission to show notifications');
    return;
  }

  try {
    const notification = new Notification(title, options);
    console.log('[Notifications] Notification shown:', { title, options });
    return notification;
  } catch (error) {
    console.error('[Notifications] Error showing notification:', error);
  }
};
