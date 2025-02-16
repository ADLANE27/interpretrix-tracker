
import { supabase } from "@/integrations/supabase/client";

export const registerDevice = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Just log device registration for now
    console.log('Device registered for notifications');
    return true;
  } catch (error) {
    console.error('Error registering device:', error);
    return false;
  }
};
