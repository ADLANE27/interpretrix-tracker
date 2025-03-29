
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PrivateReservation, CompanyType } from "@/types/privateReservation";

interface UseReservationsProps {
  nameFilter: string;
  sourceLanguageFilter: string;
  targetLanguageFilter: string;
  startDateFilter: string;
  endDateFilter: string;
  companyFilter: string;
}

export const useReservations = ({
  nameFilter,
  sourceLanguageFilter,
  targetLanguageFilter,
  startDateFilter,
  endDateFilter,
  companyFilter
}: UseReservationsProps) => {
  const [reservations, setReservations] = useState<PrivateReservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      console.log('[useReservations] Fetching reservations with filters:', {
        nameFilter, sourceLanguageFilter, targetLanguageFilter, startDateFilter, endDateFilter, companyFilter
      });
      
      let query = supabase
        .from('private_reservations')
        .select(`
          *,
          interpreter_profiles (
            first_name,
            last_name,
            profile_picture_url
          )
        `)
        .order('start_time', { ascending: true });

      // Apply name filter with correct filter syntax for PostgreSQL
      if (nameFilter && nameFilter.trim() !== '') {
        const searchTerm = nameFilter.trim().toLowerCase();
        console.log('[useReservations] Applying name filter with term:', searchTerm);
        
        query = query.or(`interpreter_profiles.first_name.ilike.%${searchTerm}%,interpreter_profiles.last_name.ilike.%${searchTerm}%`);
      }

      if (sourceLanguageFilter !== 'all') {
        query = query.eq('source_language', sourceLanguageFilter);
      }

      if (targetLanguageFilter !== 'all') {
        query = query.eq('target_language', targetLanguageFilter);
      }

      if (companyFilter !== 'all') {
        query = query.eq('company', companyFilter as CompanyType);
      }

      if (startDateFilter) {
        query = query.gte('start_time', `${startDateFilter}T00:00:00`);
      }

      if (endDateFilter) {
        query = query.lte('start_time', `${endDateFilter}T23:59:59`);
      }

      console.log('[useReservations] Executing query...');
      const { data, error } = await query;

      if (error) {
        console.error('[useReservations] Error:', error);
        throw error;
      }
      
      console.log('[useReservations] Query successful, found', data?.length || 0, 'reservations');
      setReservations(data || []);
    } catch (error) {
      console.error('[useReservations] Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('private_reservations')
        .delete()
        .eq('id', reservationId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La réservation a été supprimée",
      });
      
      fetchReservations();
    } catch (error) {
      console.error('[useReservations] Delete Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la réservation",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [nameFilter, sourceLanguageFilter, targetLanguageFilter, startDateFilter, endDateFilter, companyFilter]);

  return {
    reservations,
    isLoading,
    fetchReservations,
    handleDeleteReservation
  };
};
