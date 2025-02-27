
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
        // Check if current user is admin
        const { data: roleCheck, error: roleError } = await supabase
          .rpc('is_admin');

        if (roleError) throw roleError;

        if (!roleCheck) {
          throw new Error("Unauthorized: Only administrators can access this page");
        }

        // Get user roles mapping
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*');

        if (rolesError) throw rolesError;

        // Get admin profiles
        const { data: adminProfiles, error: adminError } = await supabase
          .from('admin_profiles')
          .select('*');

        if (adminError) throw adminError;

        // Get interpreter profiles with complete data
        const { data: interpreterData, error: interpreterError } = await supabase
          .from('interpreter_profiles')
          .select('*');

        if (interpreterError) throw interpreterError;

        const roleMap = (userRoles || []).reduce((acc: Record<string, { role: string, active: boolean }>, role) => {
          acc[role.user_id] = { role: role.role, active: role.active };
          return acc;
        }, {});

        const admins = (adminProfiles || []).map(admin => ({
          id: admin.id,
          email: admin.email,
          first_name: admin.first_name,
          last_name: admin.last_name,
          role: 'admin',
          created_at: admin.created_at,
          active: roleMap[admin.id]?.active ?? false
        }));

        const interpreters = (interpreterData || []).map(interpreter => ({
          id: interpreter.id,
          email: interpreter.email,
          first_name: interpreter.first_name || '',
          last_name: interpreter.last_name || '',
          role: 'interpreter',
          created_at: interpreter.created_at,
          active: roleMap[interpreter.id]?.active ?? false,
          // Include all interpreter specific fields
          languages: interpreter.languages || [],
          employment_status: interpreter.employment_status,
          status: interpreter.status,
          phone_number: interpreter.phone_number,
          address: interpreter.address,
          birth_country: interpreter.birth_country,
          nationality: interpreter.nationality,
          siret_number: interpreter.siret_number,
          vat_number: interpreter.vat_number,
          specializations: interpreter.specializations || [],
          landline_phone: interpreter.landline_phone,
          tarif_15min: interpreter.tarif_15min,
          tarif_5min: interpreter.tarif_5min
        }));

        return {
          admins: admins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
          interpreters: interpreters.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        };
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    },
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0  // Don't cache the data
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
