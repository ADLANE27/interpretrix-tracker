
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Unregister any existing service workers before registering new one
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // First, unregister any existing service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[ServiceWorker] Unregistered old service worker');
      }

      // Then register the OneSignal service worker
      const registration = await navigator.serviceWorker.register('/OneSignalSDKWorker.js');
      console.log('[ServiceWorker] Registration successful with scope:', registration.scope);
    } catch (error) {
      console.error('[ServiceWorker] Registration failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
