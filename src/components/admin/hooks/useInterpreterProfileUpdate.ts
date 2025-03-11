
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/profile";
import { toast } from "@/hooks/use-toast";

export const useInterpreterProfileUpdate = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const updateProfile = async (data: Partial<Profile>) => {
    try {
      setIsSubmitting(true);
      
      // Create a clean profile object without extra fields
      const profileData = {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        languages: data.languages?.map(lang => `${lang.source} → ${lang.target}`),
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
        body: {
          id: data.id,
          ...profileData
        }
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast({
        title: "Profil mis à jour",
        description: "Le profil a été mis à jour avec succès",
      });
      
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
