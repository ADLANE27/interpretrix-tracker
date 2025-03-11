
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserData } from "../types/user-management";
import { useEffect } from "react";

export const useInterpreterUsers = () => {
  const queryClient = useQueryClient();

  const {
    data: interpreters = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['interpreter-users'],
    queryFn: async () => {
      const { data: interpreterData, error: interpreterError } = await supabase
        .from('interpreter_profiles')
        .select('*');

      if (interpreterError) throw interpreterError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'interpreter');

      if (rolesError) throw rolesError;

      const roleMap = userRoles.reduce((acc: Record<string, boolean>, role) => {
        acc[role.user_id] = role.active;
        return acc;
      }, {});

      return (interpreterData || []).map(interpreter => ({
        id: interpreter.id,
        email: interpreter.email,
        first_name: interpreter.first_name || '',
        last_name: interpreter.last_name || '',
        role: 'interpreter',
        created_at: interpreter.created_at,
        active: roleMap[interpreter.id] ?? false,
        languages: (interpreter.languages || []).map((lang: string) => {
          const [source, target] = lang.split('→').map(l => l.trim());
          return { source, target };
        }),
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
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('interpreter-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpreter_profiles'
        },
        async (payload) => {
          // Refresh the query when changes occur
          await queryClient.invalidateQueries({ queryKey: ['interpreter-users'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    interpreters,
    isLoading,
    error
  };
};
