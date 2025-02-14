
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

    if (!data || !data.publicKey || !data.privateKey) {
      console.error('[VAPID] Invalid response:', data);
      throw new Error('Invalid response from key generation service');
    }

    // Validate key format
    const isValidBase64Url = (key: string) => /^[A-Za-z0-9\-_]+$/.test(key);
    if (!isValidBase64Url(data.publicKey) || !isValidBase64Url(data.privateKey)) {
      console.error('[VAPID] Invalid key format:', {
        publicKey: data.publicKey.length,
        privateKey: data.privateKey.length
      });
      throw new Error('Generated keys are not in the correct format');
    }

    console.log('[VAPID] Keys generated successfully');
    return {
      publicKey: data.publicKey,
      privateKey: data.privateKey,
      copyInstructions: `Here are your VAPID keys in the correct format:

VAPID_PUBLIC_KEY:
${data.publicKey}

VAPID_PRIVATE_KEY:
${data.privateKey}

Copy each key and paste it in the Edge Function environment variables.`
    };
  } catch (error) {
    console.error('[VAPID] Error in generateAndStoreVapidKeys:', error);
    throw error;
  }
}
