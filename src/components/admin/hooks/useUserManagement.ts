import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UsersData, UserData } from "../types/user-management";
import { Profile } from "@/types/profile";
import { convertLanguagePairsToStrings, parseLanguageString } from "@/types/languages";

export const useUserManagement = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const queryClient = useQueryClient();

  // Separate queries for admins and interpreters
  const {
    data: admins = [],
    isLoading: isLoadingAdmins
  } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const { data: adminProfiles, error: adminError } = await supabase
        .from('admin_profiles')
        .select('*');

      if (adminError) throw adminError;

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'admin');

      const roleMap = (rolesData || []).reduce((acc: Record<string, boolean>, role) => {
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
  });

  const {
    data: interpreters = [],
    isLoading: isLoadingInterpreters
  } = useQuery({
    queryKey: ['interpreters'],
    queryFn: async () => {
      const { data: interpreterData, error: interpreterError } = await supabase
        .from('interpreter_profiles')
        .select('*');

      if (interpreterError) throw interpreterError;

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'interpreter');

      const roleMap = (rolesData || []).reduce((acc: Record<string, boolean>, role) => {
        acc[role.user_id] = role.active;
        return acc;
      }, {});

      return (interpreterData || []).map(interpreter => {
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
          active: roleMap[interpreter.id] ?? false,
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
    },
  });

  useEffect(() => {
    // Set up real-time subscription only for interpreter profile changes
    const channel = supabase.channel('interpreter-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'interpreter_profiles'
      }, (payload) => {
        // Only invalidate interpreters query
        queryClient.invalidateQueries({ queryKey: ['interpreters'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur: " + error.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = {
    admins: admins.filter(user => {
      const searchTerm = searchQuery.toLowerCase().trim();
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      return fullName.includes(searchTerm) || email.includes(searchTerm);
    }),
    interpreters: interpreters.filter(user => {
      const searchTerm = searchQuery.toLowerCase().trim();
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const email = user.email.toLowerCase();
      return fullName.includes(searchTerm) || email.includes(searchTerm);
    })
  };

  return {
    users: filteredUsers,
    isLoading: isLoadingAdmins || isLoadingInterpreters,
    searchQuery,
    setSearchQuery,
    handleDeleteUser,
    queryClient,
    isSubmitting,
    setIsSubmitting,
    selectedUser,
    setSelectedUser
  };
};
