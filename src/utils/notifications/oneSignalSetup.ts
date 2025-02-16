
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

// Set external user ID for targeting
export const setExternalUserId = async (interpreterId: string) => {
  try {
    const OneSignal = getOneSignal();
    await OneSignal.setExternalUserId(interpreterId);
    console.log('[OneSignal] External user ID set:', interpreterId);
  } catch (error) {
    console.error('[OneSignal] Error setting external user ID:', error);
  }
};

// Set interpreter tags for better targeting
export const setInterpreterTags = async (interpreterData: {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  languages: { source: string; target: string }[];
}) => {
  try {
    const OneSignal = getOneSignal();
    const tags = {
      interpreter_id: interpreterData.id,
      first_name: interpreterData.first_name,
      last_name: interpreterData.last_name,
      email: interpreterData.email,
      languages: interpreterData.languages.map(lang => `${lang.source}→${lang.target}`).join(',')
    };
    
    await OneSignal.sendTags(tags);
    console.log('[OneSignal] Tags set successfully:', tags);
    return true;
  } catch (error) {
    console.error('[OneSignal] Error setting tags:', error);
    return false;
  }
};
