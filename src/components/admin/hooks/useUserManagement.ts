import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UsersData, UserData } from "../types/user-management";
import { Profile } from "@/types/profile";
import { convertLanguagePairsToStrings, parseLanguageString } from "@/types/languages";
import { WorkLocation } from "@/utils/workLocationStatus";

export const useUserManagement = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const queryClient = useQueryClient();

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
            booth_number: interpreter.booth_number || '',
            private_phone: interpreter.private_phone || '',
            professional_phone: interpreter.professional_phone || '',
            tarif_15min: interpreter.tarif_15min,
            tarif_5min: interpreter.tarif_5min
          };
        });

        const result: UsersData = {
          admins: admins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
          interpreters: interpreters.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        };

        return result;
      } catch (error) {
        console.error('Error fetching users:', error);
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

  const handleUpdateProfile = async (data: Partial<Profile>) => {
    if (!selectedUser) return;
    
    try {
      setIsSubmitting(true);
      
      console.log('Incoming profile data:', data);
      
      const transformedData = {
        ...data,
        languages: data.languages ? convertLanguagePairsToStrings(data.languages) : undefined,
        work_hours: data.work_hours ? {
          start_morning: data.work_hours.start_morning,
          end_morning: data.work_hours.end_morning,
          start_afternoon: data.work_hours.start_afternoon,
          end_afternoon: data.work_hours.end_afternoon
        } : null,
        address: data.address ? {
          street: data.address.street,
          postal_code: data.address.postal_code,
          city: data.address.city
        } : null,
        booth_number: data.booth_number === '' ? null : data.booth_number,
        private_phone: data.private_phone === '' ? null : data.private_phone,
        professional_phone: data.professional_phone === '' ? null : data.professional_phone,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number,
        employment_status: data.employment_status,
        status: data.status,
        birth_country: data.birth_country,
        nationality: data.nationality,
        siret_number: data.siret_number,
        vat_number: data.vat_number,
        specializations: data.specializations,
        landline_phone: data.landline_phone,
        tarif_15min: data.tarif_15min,
        tarif_5min: data.tarif_5min,
        work_location: data.work_location
      };
      
      console.log('Complete transformed data:', transformedData);

      const cleanedData = Object.fromEntries(
        Object.entries(transformedData)
          .filter(([key, value]) => value !== undefined && key !== 'active')
      );
      
      console.log('Cleaned data being sent for update:', cleanedData);

      const { data: currentData, error: checkError } = await supabase
        .from('interpreter_profiles')
        .select('*')
        .eq('id', selectedUser.id)
        .single();

      if (checkError) {
        console.error('Error checking current data:', checkError);
        throw checkError;
      }

      console.log('Current data in database:', currentData);
      
      const { data: updatedData, error } = await supabase
        .from('interpreter_profiles')
        .update(cleanedData)
        .eq('id', selectedUser.id)
        .select('*');

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      if (!updatedData || updatedData.length === 0) {
        throw new Error("Update didn't return any data");
      }

      console.log('Successfully updated data:', updatedData[0]);

      const transformedProfile: Profile = {
        ...updatedData[0],
        languages: (updatedData[0].languages || []).map(parseLanguageString),
        status: updatedData[0].status as Profile['status'],
        work_hours: updatedData[0].work_hours && typeof updatedData[0].work_hours === 'object' ? {
          start_morning: String((updatedData[0].work_hours as Record<string, unknown>).start_morning || '09:00'),
          end_morning: String((updatedData[0].work_hours as Record<string, unknown>).end_morning || '13:00'),
          start_afternoon: String((updatedData[0].work_hours as Record<string, unknown>).start_afternoon || '14:00'),
          end_afternoon: String((updatedData[0].work_hours as Record<string, unknown>).end_afternoon || '17:00')
        } : null,
        address: updatedData[0].address && typeof updatedData[0].address === 'object' ? {
          street: String((updatedData[0].address as Record<string, unknown>).street || ''),
          postal_code: String((updatedData[0].address as Record<string, unknown>).postal_code || ''),
          city: String((updatedData[0].address as Record<string, unknown>).city || '')
        } : null,
        employment_status: updatedData[0].employment_status,
        specializations: updatedData[0].specializations || [],
        profile_picture_url: updatedData[0].profile_picture_url || null,
        booth_number: updatedData[0].booth_number,
        private_phone: updatedData[0].private_phone,
        professional_phone: updatedData[0].professional_phone,
        password_changed: updatedData[0].password_changed || false,
        work_location: updatedData[0].work_location as WorkLocation
      };

      setSelectedUser(transformedProfile);
      
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await refetch();

      toast({
        title: "Profil mis à jour",
        description: "Le profil a été mis à jour avec succès",
      });
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
    isSubmitting,
    setIsSubmitting,
    refetch,
    selectedUser,
    setSelectedUser
  };
};

