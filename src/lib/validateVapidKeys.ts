
import { supabase } from "@/integrations/supabase/client";

interface ValidationResult {
  valid: boolean;
  publicKeyValid: boolean;
  privateKeyValid: boolean;
  details: {
    publicKey: string;
    privateKey: string;
  };
}

export async function validateVapidKeys(): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('validate-vapid-key', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (error) {
      console.error('[VAPID] Validation error:', error);
      throw error;
    }

    return data as ValidationResult;
  } catch (error) {
    console.error('[VAPID] Error in validateVapidKeys:', error);
    throw error;
  }
}

