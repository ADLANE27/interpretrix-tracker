
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

// Function to clean up existing service workers
const cleanupServiceWorkers = async () => {
  if (!('serviceWorker' in navigator)) return;
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('[ServiceWorker] Found registrations:', registrations.length);
    
    for (const registration of registrations) {
      if (!registration.scope.includes('OneSignal')) {
        await registration.unregister();
        console.log('[ServiceWorker] Unregistered:', registration.scope);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Cleanup error:', error);
  }
};

// Initialize OneSignal
const initializeOneSignal = async () => {
  // If already initialized, resolve the promise and return
  if (window.oneSignalInitialized) {
    console.log('[OneSignal] Already initialized, resolving promise...');
    window.resolveOneSignal?.();
    return;
  }

  try {
    // Clean up service workers first
    await cleanupServiceWorkers();
    
    console.log('[OneSignal] Starting initialization...');
    
    if (!window.OneSignal) {
      console.error('[OneSignal] OneSignal SDK not loaded');
      throw new Error('OneSignal SDK not loaded');
    }

    // Force cleanup any existing subscription
    try {
      await window.OneSignal.setSubscription(false);
    } catch (error) {
      console.log('[OneSignal] No existing subscription to clean');
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
    throw error;
  }
};

// Initialize on page load
window.addEventListener('load', async () => {
  try {
    console.log('[OneSignal] Page loaded, starting initialization...');
    await initializeOneSignal();
    console.log('[OneSignal] Setup completed');
  } catch (error) {
    console.error('[OneSignal] Setup error:', error);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
