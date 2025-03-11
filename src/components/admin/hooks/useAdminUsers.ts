
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserData } from "../types/user-management";
import { useEffect } from "react";
import { useUserManagementToasts } from "./useUserManagementToasts";

export const useAdminUsers = () => {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast, showLoadingToast } = useUserManagementToasts();

  const {
    data: admins = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: adminProfiles, error: adminError } = await supabase
        .from('admin_profiles')
        .select('*');

      if (adminError) throw adminError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const roleMap = userRoles.reduce((acc: Record<string, boolean>, role) => {
        acc[role.user_id] = role.active;
        return acc;
      }, {});

      return (adminProfiles || []).map(admin => ({
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: 'admin',
        created_at: admin.created_at,
        active: roleMap[admin.id] ?? false
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_profiles'
        },
        async (payload) => {
          // Refresh the query when changes occur
          await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    admins,
    isLoading,
    error
  };
};
