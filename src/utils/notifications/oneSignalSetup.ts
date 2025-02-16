
import { ONESIGNAL_APP_ID } from './types';

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
