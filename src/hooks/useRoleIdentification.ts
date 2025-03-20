
import { useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

export const useRoleIdentification = () => {
  const identifyUserRole = useCallback(async (): Promise<string | null> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[useRoleIdentification] No authenticated user found');
        return null;
      }
      
      // Check if user is an admin
      const { data: adminRoleData, error: adminError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (adminError) {
        console.error('[useRoleIdentification] Error checking admin role:', adminError);
      }
      
      if (adminRoleData?.role === 'admin') {
        return 'admin';
      }
      
      // Check if user is an interpreter
      const { data: interpreterData, error: interpreterError } = await supabase
        .from('interpreters')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (interpreterError) {
        console.error('[useRoleIdentification] Error checking interpreter role:', interpreterError);
      }
      
      if (interpreterData) {
        return 'interpreter';
      }
      
      return 'user';
    } catch (error) {
      console.error('[useRoleIdentification] Error identifying user role:', error);
      return null;
    }
  }, []);

  return { identifyUserRole };
};
