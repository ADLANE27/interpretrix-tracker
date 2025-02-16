
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
      await registration.unregister();
      console.log('[ServiceWorker] Unregistered:', registration.scope);
    }
  } catch (error) {
    console.error('[ServiceWorker] Cleanup error:', error);
  }
};

// Initialize OneSignal with retry logic
const initializeOneSignal = async (retryCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  try {
    // Clean up service workers first
    await cleanupServiceWorkers();
    
    console.log('[OneSignal] Starting initialization...');
    
    if (!window.OneSignal) {
      if (retryCount < MAX_RETRIES) {
        console.log(`[OneSignal] SDK not loaded, retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return initializeOneSignal(retryCount + 1);
      }
      throw new Error('OneSignal SDK not loaded after retries');
    }

    // Initialize OneSignal
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

    // Check if we need to resubscribe
    const isPushEnabled = await window.OneSignal.isPushNotificationsEnabled();
    console.log('[OneSignal] Push notifications enabled:', isPushEnabled);
    
    if (isPushEnabled) {
      // Ensure we have a valid player ID
      const playerId = await window.OneSignal.getUserId();
      console.log('[OneSignal] Current player ID:', playerId);
      
      if (!playerId) {
        console.log('[OneSignal] No player ID found, resubscribing...');
        await window.OneSignal.setSubscription(true);
      }
    }

    console.log('[OneSignal] Initialization completed successfully');
    window.oneSignalInitialized = true;
    window.resolveOneSignal?.();
  } catch (error) {
    console.error('[OneSignal] Initialization failed:', error);
    if (retryCount < MAX_RETRIES) {
      console.log(`[OneSignal] Retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return initializeOneSignal(retryCount + 1);
    }
    window.rejectOneSignal?.(error);
    throw error;
  }
};

// Create root element once
const root = createRoot(document.getElementById("root")!);

// Initialize OneSignal and render app
const startApp = async () => {
  try {
    await initializeOneSignal();
  } catch (error) {
    console.error('[OneSignal] Setup error:', error);
    // Continue even if OneSignal fails
  } finally {
    // Render app only once
    root.render(<App />);
  }
};

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
