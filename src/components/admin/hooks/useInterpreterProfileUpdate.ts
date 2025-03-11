import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/profile";
import { useQueryClient } from "@tanstack/react-query";
import { LanguagePair } from "@/types/languages";
import { isValidLanguagePair } from "@/utils/languageFormatting";

export const useInterpreterProfileUpdate = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const validateLanguagePairs = (languages: LanguagePair[]) => {
    return languages.every(lang => 
      lang && 
      typeof lang === 'object' && 
      typeof lang.source === 'string' && 
      typeof lang.target === 'string' && 
      lang.source.trim() !== '' && 
      lang.target.trim() !== ''
    );
  };

  const formatLanguagePairs = (languages: LanguagePair[]) => {
    return languages
      .filter(lang => isValidLanguagePair(lang))
      .map(lang => ({
        source: lang.source.trim(),
        target: lang.target.trim()
      }));
  };

  const updateProfile = async (data: Partial<Profile> & { id: string }) => {
    try {
      setIsSubmitting(true);
      
      if (data.languages && !validateLanguagePairs(data.languages)) {
        throw new Error("Invalid language pairs format");
      }

      const profileData = {
        id: data.id,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        languages: data.languages ? formatLanguagePairs(data.languages) : undefined,
        employment_status: data.employment_status,
        status: data.status,
        phone_number: data.phone_number,
        address: data.address,
        birth_country: data.birth_country,
        nationality: data.nationality,
        siret_number: data.siret_number,
        vat_number: data.vat_number,
        specializations: data.specializations,
        landline_phone: data.landline_phone,
        tarif_15min: data.tarif_15min,
        tarif_5min: data.tarif_5min,
        booth_number: data.booth_number,
        professional_phone: data.professional_phone,
        private_phone: data.private_phone,
        work_hours: data.work_hours
      };
      
      const { error } = await supabase.functions.invoke('update-interpreter-profile', {
        body: profileData
      });

      if (error) throw error;

      toast({
        title: "Profil mis à jour",
        description: "Le profil a été mis à jour avec succès",
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      return true;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil: " + error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    updateProfile,
    isSubmitting,
    setIsSubmitting
  };
};
