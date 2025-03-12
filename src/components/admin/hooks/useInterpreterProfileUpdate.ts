
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/profile";
import { useQueryClient } from "@tanstack/react-query";
import { LanguagePair } from "@/types/languages";

export const useInterpreterProfileUpdate = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const formatLanguagePairs = (languages: LanguagePair[]) => {
    return languages
      .filter(lang => lang && lang.source && lang.target)
      .map(lang => `${lang.source.trim()} → ${lang.target.trim()}`);
  };

  const updateProfile = async (data: Partial<Profile> & { id: string }) => {
    try {
      setIsSubmitting(true);
      console.log('Updating profile with data:', data);

      const profileData = {
        ...data,
        // Ensure required fields are never null
        languages: data.languages ? formatLanguagePairs(data.languages) : [],
        tarif_15min: data.tarif_15min || 0,
        tarif_5min: data.tarif_5min || 0,
        booth_number: data.booth_number || "",
        private_phone: data.private_phone || "",
        professional_phone: data.professional_phone || "",
      };

      const { error } = await supabase.functions.invoke('update-interpreter-profile', {
        body: profileData
      });

      if (error) throw error;

      // Invalidate and refetch data
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
    isSubmitting
  };
};
