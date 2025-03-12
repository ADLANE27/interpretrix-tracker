
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validatePassword } from '@/utils/validation/passwordValidation';
import { InterpreterFormData } from '@/components/admin/forms/InterpreterProfileForm';
import { useUserManagementToasts } from '@/components/admin/hooks/useUserManagementToasts';
import { formatLanguageString } from '@/types/languages';

export const useInterpreterCreation = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { showSuccessToast, showErrorToast, showLoadingToast } = useUserManagementToasts();

  const createInterpreter = async (data: InterpreterFormData) => {
    try {
      setIsCreating(true);

      // Basic validation
      if (!data.employment_status) {
        throw new Error("Le statut professionnel est requis");
      }
      if (!data.languages || data.languages.length === 0) {
        throw new Error("Au moins une paire de langues est requise");
      }

      // Format data for the edge function
      const formattedData = {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        employment_status: data.employment_status,
        languages: data.languages.map(lang => formatLanguageString(lang)),
        phone_number: data.phone_number || null,
        address: data.address || null,
        booth_number: data.booth_number || null,
        private_phone: data.private_phone || null,
        professional_phone: data.professional_phone || null,
        work_hours: data.work_hours || null,
        tarif_15min: Number(data.tarif_15min) || 0,
        tarif_5min: Number(data.tarif_5min) || 0,
        birth_country: data.birth_country || null,
        nationality: data.nationality || null,
        siret_number: data.siret_number || null,
        vat_number: data.vat_number || null,
        // Only include password if it's a non-empty string
        password: data.password ? data.password.trim() : undefined
      };

      console.log('Creating interpreter with formatted data:', formattedData);
      
      const loadingToast = showLoadingToast(
        "Création en cours",
        "L'interprète est en cours de création..."
      );

      const { data: response, error } = await supabase.functions.invoke('send-invitation-email', {
        body: formattedData
      });

      loadingToast.dismiss();

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!response?.success) {
        throw new Error(response?.message || "Erreur lors de la création de l'interprète");
      }

      showSuccessToast(
        "Interprète créé",
        "Un email d'invitation a été envoyé à l'interprète"
      );

      return response;

    } catch (error: any) {
      console.error('Error creating interpreter:', error);
      showErrorToast(
        "Impossible de créer l'interprète",
        error.message || "Une erreur est survenue lors de la création"
      );
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createInterpreter,
    isCreating
  };
};
