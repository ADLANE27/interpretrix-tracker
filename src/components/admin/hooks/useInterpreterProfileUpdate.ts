
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

      // Only include fields that have values (not undefined)
      const profileData: Record<string, any> = {
        id: data.id
      };

      // Only include fields that are present and not undefined
      if (data.email !== undefined) profileData.email = data.email;
      if (data.first_name !== undefined) profileData.first_name = data.first_name;
      if (data.last_name !== undefined) profileData.last_name = data.last_name;
      if (data.languages !== undefined) profileData.languages = formatLanguagePairs(data.languages);
      if (data.employment_status !== undefined) profileData.employment_status = data.employment_status;
      if (data.status !== undefined) profileData.status = data.status;
      if (data.phone_number !== undefined) profileData.phone_number = data.phone_number;
      if (data.address !== undefined) profileData.address = data.address;
      if (data.birth_country !== undefined) profileData.birth_country = data.birth_country;
      if (data.nationality !== undefined) profileData.nationality = data.nationality;
      if (data.siret_number !== undefined) profileData.siret_number = data.siret_number;
      if (data.vat_number !== undefined) profileData.vat_number = data.vat_number;
      if (data.specializations !== undefined) profileData.specializations = data.specializations;
      if (data.landline_phone !== undefined) profileData.landline_phone = data.landline_phone;
      if (data.tarif_15min !== undefined) profileData.tarif_15min = data.tarif_15min;
      if (data.tarif_5min !== undefined) profileData.tarif_5min = data.tarif_5min;
      if (data.booth_number !== undefined) profileData.booth_number = data.booth_number;
      if (data.professional_phone !== undefined) profileData.professional_phone = data.professional_phone;
      if (data.private_phone !== undefined) profileData.private_phone = data.private_phone;
      if (data.work_hours !== undefined) profileData.work_hours = data.work_hours;
      
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
