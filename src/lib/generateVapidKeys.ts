
import { supabase } from "@/integrations/supabase/client";

export async function generateAndStoreVapidKeys() {
  try {
    const { data, error } = await supabase.functions.invoke('generate-vapid-keys', {
      method: 'POST'
    });

    if (error) {
      console.error('Error generating VAPID keys:', error);
      throw error;
    }

    console.log('VAPID keys generated:', data);
    return data;
  } catch (error) {
    console.error('Error in generateAndStoreVapidKeys:', error);
    throw error;
  }
}
