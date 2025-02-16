
import { ONESIGNAL_APP_ID } from './types';

// Wait for OneSignal initialization with timeout
export const waitForOneSignal = async (timeout = 10000) => {
  try {
    console.log('[OneSignal] Waiting for initialization...');
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OneSignal initialization timeout')), timeout);
    });
    await Promise.race([window.oneSignalInitPromise, timeoutPromise]);
    console.log('[OneSignal] Initialization confirmed');
    return true;
  } catch (error) {
    console.error('[OneSignal] Error waiting for initialization:', error);
    return false;
  }
};
