
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UsersData, UserData } from "../types/user-management";
import { useUserManagementToasts } from "./useUserManagementToasts";
import { Profile } from "@/types/profile";

export const useUserManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast, showLoadingToast } = useUserManagementToasts();

  const {
    data: users = { admins: [], interpreters: [] },
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const { data: roleCheck, error: roleError } = await supabase
          .rpc('is_admin');

        if (roleError) throw roleError;

        if (!roleCheck) {
          throw new Error("Unauthorized: Only administrators can access this page");
        }

        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*');

        if (rolesError) throw rolesError;

        const { data: adminProfiles, error: adminError } = await supabase
          .from('admin_profiles')
          .select('*');

        if (adminError) throw adminError;

        const { data: interpreterData, error: interpreterError } = await supabase
          .from('interpreter_profiles')
          .select('*');

        if (interpreterError) throw interpreterError;

        const roleMap = (userRoles || []).reduce((acc: Record<string, { role: string, active: boolean }>, role) => {
          acc[role.user_id] = { role: role.role, active: role.active };
          return acc;
        }, {});

        const admins: UserData[] = (adminProfiles || []).map(admin => ({
          id: admin.id,
          email: admin.email,
          first_name: admin.first_name,
          last_name: admin.last_name,
          role: 'admin',
          created_at: admin.created_at,
          active: roleMap[admin.id]?.active ?? false
        }));

        const interpreters: UserData[] = (interpreterData || []).map(interpreter => {
          const languages = (interpreter.languages || []).map((lang: string) => {
            const [source, target] = lang.split('→').map(l => l.trim());
            return { source, target };
          });

          let parsedAddress: Profile['address'] = null;
          if (interpreter.address && typeof interpreter.address === 'object') {
            const addr = interpreter.address as any;
            if (addr.street && addr.postal_code && addr.city) {
              parsedAddress = {
                street: String(addr.street),
                postal_code: String(addr.postal_code),
                city: String(addr.city)
              };
            }
          }

          return {
            id: interpreter.id,
            email: interpreter.email,
            first_name: interpreter.first_name || '',
            last_name: interpreter.last_name || '',
            role: 'interpreter',
            created_at: interpreter.created_at,
            active: roleMap[interpreter.id]?.active ?? false,
            languages,
            employment_status: interpreter.employment_status,
            status: (interpreter.status || 'available') as Profile['status'],
            phone_number: interpreter.phone_number,
            address: parsedAddress,
            birth_country: interpreter.birth_country,
            nationality: interpreter.nationality,
            siret_number: interpreter.siret_number,
            vat_number: interpreter.vat_number,
            specializations: interpreter.specializations || [],
            landline_phone: interpreter.landline_phone,
            tarif_15min: interpreter.tarif_15min,
            tarif_5min: interpreter.tarif_5min,
            booth_number: interpreter.booth_number || '',
            private_phone: interpreter.private_phone || '',
            professional_phone: interpreter.professional_phone || ''
          };
        });

        const result: UsersData = {
          admins: admins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
          interpreters: interpreters.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        };

        return result;
      } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        throw error;
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  useEffect(() => {
    const handleRefetch = () => {
      refetch();
    };

    window.addEventListener('refetchUserData', handleRefetch);
    return () => {
      window.removeEventListener('refetchUserData', handleRefetch);
    };
  }, [refetch]);

  const handleDeleteUser = async (userId: string) => {
    try {
      const loadingToast = showLoadingToast(
        "Suppression en cours",
        "L'utilisateur est en cours de suppression..."
      );

      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 1000));
      loadingToast.dismiss();

      showSuccessToast(
        "Utilisateur supprimé",
        "L'utilisateur a été supprimé avec succès"
      );

      refetch();
    } catch (error: any) {
      showErrorToast(
        "Erreur lors de la suppression",
        error
      );
    }
  };

  const handleUpdateProfile = async (data: Partial<Profile>) => {
    try {
      const loadingToast = showLoadingToast(
        "Mise à jour en cours",
        "Le profil est en cours de mise à jour..."
      );

      const { error } = await supabase.functions.invoke('update-interpreter-profile', {
        body: {
          ...data,
          languages: data.languages?.map(lang => ({
            source: lang.source,
            target: lang.target
          }))
        },
      });

      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 1000));
      loadingToast.dismiss();

      showSuccessToast(
        "Profil mis à jour",
        "Le profil a été mis à jour avec succès"
      );

      refetch();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      showErrorToast(
        "Impossible de mettre à jour le profil",
        error.message || "Une erreur est survenue lors de la mise à jour"
      );
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
    handleUpdateProfile,
    queryClient,
    refetch,
  };
};
