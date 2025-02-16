
export const initializeNotifications = async () => {
  try {
    // Request notification permission
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
};
