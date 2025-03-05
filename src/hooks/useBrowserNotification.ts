
import { useState, useEffect, useCallback } from 'react';

export const useBrowserNotification = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
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

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon.svg',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [permission]);

  return {
    permission,
    requestPermission,
    showNotification
  };
};
