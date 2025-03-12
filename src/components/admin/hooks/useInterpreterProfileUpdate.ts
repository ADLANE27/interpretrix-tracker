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
      .map(lang => `${lang.source.trim()} → ${lang.target.trim()}`);
  };

  const updateProfile = async (data: Partial<Profile> & { id: string }) => {
    try {
      setIsSubmitting(true);
      
      if (data.languages && !validateLanguagePairs(data.languages)) {
        throw new Error("Invalid language pairs format");
      }

      const profileData: Record<string, any> = {
        id: data.id
      };

      // Include all fields that are present
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id') {
          if (key === 'languages' && Array.isArray(value)) {
            profileData.languages = formatLanguagePairs(value as LanguagePair[]);
          } else {
            // Always include these three fields, even if they're empty strings
            if (['booth_number', 'private_phone', 'professional_phone'].includes(key)) {
              profileData[key] = value || ''; // Convert undefined/null to empty string
            } else {
              profileData[key] = value;
            }
          }
        }
      });

      console.log('Updating profile with data:', profileData);

      const { error } = await supabase.functions.invoke('update-interpreter-profile', {
        body: profileData
      });

      if (error) throw error;

      // Update the cache with the new data
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      
      // Wait for the cache to be updated before showing success message
      await new Promise(resolve => setTimeout(resolve, 500));

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
