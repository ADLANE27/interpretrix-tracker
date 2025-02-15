
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize OneSignal before registering service worker
const initializeOneSignal = async () => {
  try {
    console.log('[OneSignal] Initializing...');
    // Wait for OneSignal to be defined
    while (typeof window.OneSignal === 'undefined') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for OneSignal initialization to complete
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('OneSignal initialization timeout'));
      }, 10000);

      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          await OneSignal.init({
            appId: "2f15c47a-f369-4206-b077-eaddd8075b04",
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerParam: { scope: '/' },
            serviceWorkerPath: '/OneSignalSDKWorker.js',
          });
          clearTimeout(timeout);
          console.log('[OneSignal] Initialization successful');
          resolve();
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('[OneSignal] Initialization error:', error);
    throw error;
  }
};

// Wait for page load before initializing everything
window.addEventListener('load', async () => {
  try {
    console.log('[ServiceWorker] Starting initialization...');
    
    // First, unregister any existing service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[ServiceWorker] Unregistered old service worker');
    }

    // Small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Initialize OneSignal first
    await initializeOneSignal();
    console.log('[OneSignal] Setup completed');

    // Then register the OneSignal service worker
    const registration = await navigator.serviceWorker.register('/OneSignalSDKWorker.js', {
      scope: '/'
    });
    console.log('[ServiceWorker] Registration successful with scope:', registration.scope);
  } catch (error) {
    console.error('[ServiceWorker/OneSignal] Setup failed:', error);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
