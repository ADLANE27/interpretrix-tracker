
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
  const userRole = useRef<'admin' | 'interpreter' | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          userRole.current = data.role as 'admin' | 'interpreter';
          console.log(`[useUserRole] User role identified as: ${userRole.current}`);
        }
      } catch (error) {
        console.error('[useUserRole] Error determining user role:', error);
      }
    };
    
    checkUserRole();
  }, []);

  return userRole;
};
