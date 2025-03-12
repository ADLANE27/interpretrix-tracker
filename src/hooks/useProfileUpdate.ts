
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/profile";
import { convertLanguagePairsToStrings } from "@/types/languages";
import { useQueryClient } from "@tanstack/react-query";

export const useProfileUpdate = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProfile = async (userId: string, data: Partial<Profile>) => {
    if (isSubmitting) return { success: false };
    
    setIsSubmitting(true);
    
    try {
      const transformedData = {
        ...data,
        languages: data.languages ? convertLanguagePairsToStrings(data.languages) : undefined,
      };
      
      delete (transformedData as any).active;
      
      // Start optimistic update
      queryClient.setQueryData(['users'], (oldData: any) => {
        if (!oldData) return oldData;
        
        const updatedInterpreters = oldData.interpreters?.map((interpreter: any) => {
          if (interpreter.id === userId) {
            return { ...interpreter, ...transformedData };
          }
          return interpreter;
        });
        
        return {
          ...oldData,
          interpreters: updatedInterpreters || oldData.interpreters,
        };
      });

      const { error } = await supabase
        .from('interpreter_profiles')
        .update(transformedData)
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Profil mis à jour",
        description: "Le profil a été mis à jour avec succès",
      });

      await queryClient.invalidateQueries({ queryKey: ['users'] });

      return { success: true };
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil: " + error.message,
        variant: "destructive",
      });
      
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      
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
