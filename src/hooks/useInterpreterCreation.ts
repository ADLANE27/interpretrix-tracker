
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

      // Validate required fields
      if (!data.employment_status) {
        throw new Error("Le statut professionnel est requis");
      }
      if (!data.languages || data.languages.length === 0) {
        throw new Error("Au moins une paire de langues est requise");
      }
      if (typeof data.tarif_15min !== 'number' || data.tarif_15min < 0) {
        throw new Error("Le tarif pour 15 minutes doit être un nombre positif");
      }
      if (typeof data.tarif_5min !== 'number' || data.tarif_5min < 0) {
        throw new Error("Le tarif pour 5 minutes doit être un nombre positif");
      }

      // Only validate password if it's provided
      if (data.password) {
        const passwordValidation = validatePassword(data.password);
        if (!passwordValidation.isValid) {
          throw new Error(passwordValidation.error);
        }
      }

      // Format the data for the edge function
      const formattedData = {
        ...data,
        // Only include password if it's a non-empty string
        password: data.password && typeof data.password === 'string' ? data.password.trim() : undefined,
        // Format language pairs to match database requirements "source → target"
        languages: data.languages.map(lang => formatLanguageString(lang))
      };

      console.log('Creating interpreter with formatted data:', formattedData);
      
      const loadingToast = showLoadingToast(
        "Création en cours",
        "L'interprète est en cours de création..."
      );

      const { data: response, error } = await supabase.functions.invoke('send-invitation-email', {
        body: formattedData,
      });

      loadingToast.dismiss();

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || "Erreur lors de la création de l'interprète");
      }

      if (!response?.success) {
        console.error('Invalid response:', response);
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
