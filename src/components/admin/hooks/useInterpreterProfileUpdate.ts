
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/profile";

export const useInterpreterProfileUpdate = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateProfile = async (data: Partial<Profile> & { id: string }) => {
    try {
      setIsSubmitting(true);
      console.log('Updating profile with data:', data);

      const { error } = await supabase.functions.invoke('update-interpreter-profile', {
        body: data
      });

      if (error) throw error;

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
