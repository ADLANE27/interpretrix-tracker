
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/profile";
import { convertLanguagePairsToStrings } from "@/types/languages";

export const useProfileUpdate = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const updateProfile = async (userId: string, data: Partial<Profile>) => {
    setIsSubmitting(true);

    try {
      // Transform the data
      const transformedData = {
        ...data,
        languages: data.languages ? convertLanguagePairsToStrings(data.languages) : undefined,
      };
      
      // Remove any potential active field
      delete (transformedData as any).active;
      
      // Trigger the update
      const { error } = await supabase
        .from('interpreter_profiles')
        .update(transformedData)
        .eq('id', userId);

      if (error) throw error;

      // Dispatch event for real-time updates
      window.dispatchEvent(new Event('refetchUserData'));
      
      toast({
        title: "Profil mis à jour",
        description: "Le profil a été mis à jour avec succès",
      });

      return { success: true };
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil: " + error.message,
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    updateProfile,
    isSubmitting
  };
};
