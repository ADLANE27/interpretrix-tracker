
import { ONESIGNAL_APP_ID } from './types';

export const initializeOneSignal = async (): Promise<void> => {
  try {
    if (!window.OneSignal) {
      console.log('[OneSignal] Loading OneSignal SDK...');
      
      // Initialize as empty array
      window.OneSignal = [];
      
      // Initialize with recommended settings
      (window.OneSignal as any[]).push(() => {
        (window.OneSignal as OneSignalFunctions).init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/" },
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: "push",
                  autoPrompt: false,
                  text: {
                    actionMessage: "Voulez-vous recevoir les notifications de nouvelles missions ?",
                    acceptButton: "Autoriser",
                    cancelButton: "Plus tard"
                  },
                  delay: {
                    pageViews: 1,
                    timeDelay: 0
                  }
                }
              ]
            }
          }
        });
      });

      console.log('[OneSignal] SDK loaded and initialized');
    } else {
      console.log('[OneSignal] SDK already loaded');
    }
  } catch (error) {
    console.error('[OneSignal] Initialization error:', error);
    throw error;
  }
};

// Utility function to get the initialized OneSignal instance
export const getOneSignal = (): OneSignalFunctions => {
  if (!window.OneSignal || Array.isArray(window.OneSignal)) {
    throw new Error('OneSignal not initialized');
  }
  return window.OneSignal as OneSignalFunctions;
};

// Utility function to check subscription status
export const getSubscriptionStatus = async (): Promise<boolean> => {
  try {
    const OneSignal = getOneSignal();
    return await OneSignal.getSubscription();
  } catch (error) {
    console.error('[OneSignal] Error checking subscription:', error);
    return false;
  }
};

// Get OneSignal Player ID safely
export const getPlayerId = async (): Promise<string | null> => {
  try {
    const OneSignal = getOneSignal();
    return await OneSignal.getUserId() || null;
  } catch (error) {
    console.error('[OneSignal] Error getting player ID:', error);
    return null;
  }
};
