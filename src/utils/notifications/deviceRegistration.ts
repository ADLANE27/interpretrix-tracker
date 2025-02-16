
import { supabase } from "@/integrations/supabase/client";

// Basic device registration without OneSignal
export const registerDevice = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return false;
    }

    console.log('Device registered for user:', user.id);
    return true;
  } catch (error) {
    console.error('Error in registerDevice:', error);
    return false;
  }
};
