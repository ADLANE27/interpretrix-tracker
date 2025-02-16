
import { supabase } from "@/integrations/supabase/client";

// Types
type OneSignalFunctions = {
  init: (config: any) => Promise<void>;
  showNativePrompt: () => Promise<NotificationPermission>;
  getUserId: () => Promise<string>;
  isPushNotificationsEnabled: () => Promise<boolean>;
  setExternalUserId: (id: string) => Promise<void>;
  sendTag: (key: string, value: string) => Promise<void>;
  sendTags: (tags: Record<string, string>) => Promise<void>;
  push: (f: () => void) => void; // Added this line to match the type in onesignal.d.ts
};

declare global {
  interface Window {
    OneSignal: (OneSignalFunctions & { push: (f: () => void) => void }) | any[];
  }
}

// Utility function to get the initialized OneSignal instance
export const getOneSignal = (): OneSignalFunctions => {
  if (!window.OneSignal || Array.isArray(window.OneSignal)) {
    throw new Error('OneSignal not initialized');
  }
  return window.OneSignal as OneSignalFunctions;
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

// Register device with OneSignal and save to database
export const registerDevice = async (interpreterId: string, interpreterData: { 
  first_name: string;
  last_name: string;
  email: string;
}) => {
  try {
    console.log('[OneSignal] Starting device registration...');
    
    const OneSignal = getOneSignal();
    
    // Get or create OneSignal subscription
    const playerId = await getPlayerId();
    if (!playerId) {
      throw new Error('Failed to get OneSignal player ID');
    }
    
    console.log('[OneSignal] Got player ID:', playerId);

    // Set user information as tags
    await OneSignal.sendTags({
      interpreter_id: interpreterId,
      first_name: interpreterData.first_name,
      last_name: interpreterData.last_name,
      email: interpreterData.email
    });

    console.log('[OneSignal] Set user tags');

    // Set external user ID for targeting
    await OneSignal.setExternalUserId(interpreterId);
    console.log('[OneSignal] Set external user ID');

    // Save subscription to database
    const { error } = await supabase
      .from('onesignal_subscriptions')
      .upsert({
        interpreter_id: interpreterId,
        player_id: playerId,
        platform: 'web',
        user_agent: navigator.userAgent,
        status: 'active',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'interpreter_id, player_id'
      });

    if (error) throw error;
    console.log('[OneSignal] Saved subscription to database');

    return playerId;
  } catch (error) {
    console.error('[OneSignal] Registration error:', error);
    throw error;
  }
};

