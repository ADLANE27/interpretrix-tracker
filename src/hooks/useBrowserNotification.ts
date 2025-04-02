
import { useState, useEffect, useCallback } from 'react';

// Define notification options interface for better type safety
export interface EnhancedNotificationOptions extends NotificationOptions {
  requireInteraction?: boolean;
  silent?: boolean;
  data?: {
    url?: string;
    messageId?: string;
    channelId?: string;
    senderId?: string;
    type?: 'message' | 'mention' | 'reply';
  };
}

export const useBrowserNotification = (test = false) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState({
    enabled: true,
    // Default settings
    notifications: {
      mentions: true,
      replies: true,
      directMessages: true,
      groupMessages: false,
    }
  });

  useEffect(() => {
    // Load settings from localStorage
    try {
      const savedSettings = localStorage.getItem('notification_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Test notification if flag is true
    if (test && Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification to verify the implementation',
        icon: '/icon.svg'
      });
    }
  }, [test]);

  const saveSettings = useCallback((newSettings: typeof settings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('notification_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  const showNotification = useCallback((title: string, options?: EnhancedNotificationOptions) => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return null;
    }

    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    if (!settings.enabled) {
      console.log('Notifications are disabled in user settings');
      return null;
    }

    try {
      // Default to require interaction for better visibility on mobile/tablet
      const notificationOptions: EnhancedNotificationOptions = {
        icon: '/icon.svg',
        requireInteraction: true, // Make notifications persist until interaction
        ...options
      };

      // Check if this notification type is enabled in settings
      const notificationType = options?.data?.type || 'message';
      if (
        (notificationType === 'mention' && !settings.notifications.mentions) ||
        (notificationType === 'reply' && !settings.notifications.replies) ||
        (notificationType === 'message' && !settings.notifications.directMessages)
      ) {
        console.log(`${notificationType} notifications are disabled in user settings`);
        return null;
      }

      const notification = new Notification(title, notificationOptions);

      notification.onclick = () => {
        window.focus();
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [permission, settings]);

  const toggleNotifications = useCallback((enabled: boolean) => {
    saveSettings({
      ...settings,
      enabled
    });
  }, [settings, saveSettings]);

  const updateNotificationSettings = useCallback((newSettings: typeof settings.notifications) => {
    saveSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        ...newSettings
      }
    });
  }, [settings, saveSettings]);

  return {
    permission,
    settings,
    requestPermission,
    showNotification,
    toggleNotifications,
    updateNotificationSettings
  };
};
