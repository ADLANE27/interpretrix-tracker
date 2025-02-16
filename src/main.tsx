
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Create a promise to track OneSignal initialization
declare global {
  interface Window {
    oneSignalInitPromise?: Promise<void>;
    resolveOneSignal?: () => void;
    rejectOneSignal?: (error: any) => void;
  }
}

window.oneSignalInitPromise = new Promise((resolve, reject) => {
  window.resolveOneSignal = resolve;
  window.rejectOneSignal = reject;
});

// Only clean up old service workers on load if Service Worker API is available
window.addEventListener('load', async () => {
  if (!('serviceWorker' in navigator)) {
    console.error('[ServiceWorker] Service Worker API not available');
    return;
  }

  try {
    console.log('[ServiceWorker] Starting cleanup...');
    
    // Unregister any existing service workers except OneSignal's
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      if (!registration.scope.includes('OneSignal')) {
        await registration.unregister();
        console.log('[ServiceWorker] Unregistered old service worker:', registration.scope);
      }
    }

    // Wait for OneSignal initialization to complete
    if (window.oneSignalInitPromise) {
      await window.oneSignalInitPromise;
      console.log('[OneSignal] Initialization completed');
    }
  } catch (error) {
    console.error('[ServiceWorker/OneSignal] Setup error:', error);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
