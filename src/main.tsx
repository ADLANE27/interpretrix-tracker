
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Create a promise to track OneSignal initialization
declare global {
  interface Window {
    oneSignalInitPromise?: Promise<void>;
    resolveOneSignal?: () => void;
    rejectOneSignal?: (error: any) => void;
    oneSignalInitialized?: boolean;
  }
}

// Only create the promise if it doesn't exist
if (!window.oneSignalInitPromise) {
  window.oneSignalInitPromise = new Promise((resolve, reject) => {
    window.resolveOneSignal = resolve;
    window.rejectOneSignal = reject;
  });
}

// Initialize OneSignal
const initializeOneSignal = async () => {
  // If already initialized, resolve the promise and return
  if (window.oneSignalInitialized) {
    console.log('[OneSignal] Already initialized, resolving promise...');
    window.resolveOneSignal?.();
    return;
  }

  try {
    console.log('[OneSignal] Starting initialization...');
    
    if (!window.OneSignal) {
      console.error('[OneSignal] OneSignal SDK not loaded');
      throw new Error('OneSignal SDK not loaded');
    }

    // Check if already subscribed, which indicates initialization
    try {
      const isPushSupported = await window.OneSignal.isPushNotificationsSupported();
      if (isPushSupported) {
        const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
        if (isSubscribed) {
          console.log('[OneSignal] Already subscribed, marking as initialized...');
          window.oneSignalInitialized = true;
          window.resolveOneSignal?.();
          return;
        }
      }
    } catch (error) {
      // If these methods fail, OneSignal is not initialized yet
      console.log('[OneSignal] Not yet initialized, proceeding with initialization...');
    }

    await window.OneSignal.init({
      appId: "2f15c47a-f369-4206-b077-eaddd8075b04",
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: '/' },
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      promptOptions: {
        slidedown: {
          prompts: [{
            type: "push" as const,
            autoPrompt: false,
            text: {
              actionMessage: "Voulez-vous recevoir des notifications pour les nouvelles missions ?",
              acceptButton: "Autoriser",
              cancelButton: "Plus tard"
            },
            delay: {
              pageViews: 1,
              timeDelay: 0
            }
          }]
        }
      }
    });

    // Mark as initialized
    window.oneSignalInitialized = true;
    console.log('[OneSignal] Initialization completed successfully');
    window.resolveOneSignal?.();
  } catch (error) {
    console.error('[OneSignal] Initialization failed:', error);
    window.rejectOneSignal?.(error);
    throw error; // Re-throw to be caught by the load event listener
  }
};

// Only clean up old service workers on load if Service Worker API is available
window.addEventListener('load', async () => {
  if (!('serviceWorker' in navigator)) {
    console.error('[ServiceWorker] Service Worker API not available');
    return;
  }

  try {
    console.log('[ServiceWorker] Starting cleanup...');
    
    // Initialize OneSignal first
    await initializeOneSignal();
    
    // Unregister any existing service workers except OneSignal's
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      if (!registration.scope.includes('OneSignal')) {
        await registration.unregister();
        console.log('[ServiceWorker] Unregistered old service worker:', registration.scope);
      }
    }

    console.log('[OneSignal] Setup completed');
  } catch (error) {
    console.error('[ServiceWorker/OneSignal] Setup error:', error);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
