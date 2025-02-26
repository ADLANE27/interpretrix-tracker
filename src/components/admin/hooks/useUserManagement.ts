
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UsersData } from "../types/user-management";

export const useUserManagement = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: users = { admins: [], interpreters: [] },
    refetch,
    isLoading,
    error
  } = useQuery<UsersData>({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*');

        if (rolesError) throw rolesError;

        const { data: interpreterData, error: interpreterError } = await supabase
          .from('interpreter_profiles')
          .select('*');

        if (interpreterError) throw interpreterError;

        const roleMap = (userRoles || []).reduce((acc: Record<string, { role: string, active: boolean }>, role) => {
          acc[role.user_id] = { role: role.role, active: role.active };
          return acc;
        }, {});

        const adminUserIds = userRoles
          ?.filter(role => role.role === 'admin')
          .map(role => role.user_id) || [];

        const { data: adminData, error: adminError } = await supabase.auth.admin.listUsers();
        
        if (adminError) throw adminError;

        const admins = (adminData?.users || [])
          .filter(user => adminUserIds.includes(user.id))
          .map(user => ({
            id: user.id,
            email: user.email,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            role: 'admin',
            created_at: user.created_at,
            active: roleMap[user.id]?.active ?? false
          }));

        const interpreters = (interpreterData || []).map(interpreter => ({
          id: interpreter.id,
          email: interpreter.email,
          first_name: interpreter.first_name || '',
          last_name: interpreter.last_name || '',
          role: 'interpreter',
          created_at: interpreter.created_at,
          active: roleMap[interpreter.id]?.active ?? false
        }));

        return {
          admins: admins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
          interpreters: interpreters.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        };
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    }
  });

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;

      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur: " + error.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = {
    admins: users.admins.filter(user => {
      const searchTerm = searchQuery.toLowerCase().trim();
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      return fullName.includes(searchTerm) || email.includes(searchTerm);
    }),
    interpreters: users.interpreters.filter(user => {
      const searchTerm = searchQuery.toLowerCase().trim();
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const email = user.email.toLowerCase();
      return fullName.includes(searchTerm) || email.includes(searchTerm);
    })
  };

  return {
    users: filteredUsers,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    handleDeleteUser,
    refetch,
    isSubmitting,
    setIsSubmitting,
  };
};
