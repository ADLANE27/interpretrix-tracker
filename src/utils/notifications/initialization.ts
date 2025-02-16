
import { ONESIGNAL_APP_ID } from './types';

// Wait for OneSignal initialization with timeout and retries
export const waitForOneSignal = async (timeout = 10000, maxRetries = 3) => {
  try {
    console.log('[OneSignal] Waiting for initialization...');
    
    let currentRetry = 0;
    while (currentRetry < maxRetries) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('OneSignal initialization timeout')), timeout);
        });

        // Wait for initialization
        await Promise.race([window.oneSignalInitPromise, timeoutPromise]);
        
        // Verify OneSignal is actually available
        if (!window.OneSignal) {
          throw new Error('OneSignal not available after initialization');
        }

        // Verify initialization state
        const isInitialized = await window.OneSignal.isPushNotificationsSupported();
        if (!isInitialized) {
          throw new Error('OneSignal not properly initialized');
        }

        console.log('[OneSignal] Initialization confirmed');
        return true;
      } catch (error) {
        currentRetry++;
        console.error(`[OneSignal] Initialization attempt ${currentRetry} failed:`, error);
        
        if (currentRetry === maxRetries) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, currentRetry)));
      }
    }

    return false;
  } catch (error) {
    console.error('[OneSignal] Error waiting for initialization:', error);
    return false;
  }
};
