
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAAskXrII2VN7W_O-KSNkL-zqNG2TLaUg0",
  authDomain: "notifications-9a9d5.firebaseapp.com",
  projectId: "notifications-9a9d5",
  storageBucket: "notifications-9a9d5.firebasestorage.app",
  messagingSenderId: "815588418594",
  appId: "1:815588418594:web:8e3b78ae49a7f86597d67b"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[Firebase SW] Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
