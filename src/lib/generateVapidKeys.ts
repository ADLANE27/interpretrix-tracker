
import { supabase } from "@/integrations/supabase/client";

export async function generateAndStoreVapidKeys() {
  try {
    console.log('[VAPID] Starting key generation process');
    
    const { data, error } = await supabase.functions.invoke('generate-vapid-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (error) {
      console.error('[VAPID] Error generating keys:', error);
      throw error;
    }

    if (!data || !data.publicKey) {
      console.error('[VAPID] Invalid response:', data);
      throw new Error('Invalid response from key generation service');
    }

    // Validate key format
    const isValidFormat = (key: string) => /^[A-Za-z0-9\-_]+$/.test(key);
    if (!isValidFormat(data.publicKey)) {
      console.error('[VAPID] Invalid key format:', {
        publicKey: data.publicKey
      });
      throw new Error('Generated keys are not in the correct format');
    }

    console.log('[VAPID] Keys generated successfully');
    return data;
  } catch (error) {
    console.error('[VAPID] Error in generateAndStoreVapidKeys:', error);
    throw error;
  }
}
