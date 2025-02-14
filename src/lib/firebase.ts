
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAAskXrII2VN7W_O-KSNkL-zqNG2TLaUg0",
  authDomain: "notifications-9a9d5.firebaseapp.com",
  projectId: "notifications-9a9d5",
  storageBucket: "notifications-9a9d5.firebasestorage.app",
  messagingSenderId: "815588418594",
  appId: "1:815588418594:web:8e3b78ae49a7f86597d67b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get messaging instance
const messaging = getMessaging(app);

// Function to request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    // Check if notification permission is already granted
    if (Notification.permission === 'granted') {
      console.log('[Firebase] Notification permission already granted');
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    // Get registration token
    const currentToken = await getToken(messaging, {
      vapidKey: "BHV5A6OLwWqL4TyjAIgewXA3qeABV0C1yEvKpBIkQT3uIQXv8YJrJtzBljQ1qFzXs1BpbqKX7XscWF9RpFYCtFU" // Replace with your VAPID key
    });

    if (currentToken) {
      console.log('[Firebase] FCM token:', currentToken);
      return currentToken;
    } else {
      throw new Error('No registration token available');
    }
  } catch (error) {
    console.error('[Firebase] An error occurred while getting token:', error);
    throw error;
  }
};

// Function to handle foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('[Firebase] Message received:', payload);
      resolve(payload);
    });
  });

// Export the Firebase app instance
export const firebaseApp = app;
