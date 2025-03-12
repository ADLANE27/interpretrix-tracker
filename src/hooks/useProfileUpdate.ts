
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/profile";
import { convertLanguagePairsToStrings } from "@/types/languages";
import { useQueryClient } from "@tanstack/react-query";

export const useProfileUpdate = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProfile = useCallback(async (userId: string, data: Partial<Profile>) => {
    if (isSubmitting) return { success: false };
    
    setIsSubmitting(true);
    let previousData: any = null;
    
    try {
      const transformedData = {
        ...data,
        languages: data.languages ? convertLanguagePairsToStrings(data.languages) : undefined,
      };
      
      delete (transformedData as any).active;
      
      // Store previous data before optimistic update
      previousData = queryClient.getQueryData(['interpreters']);
      
      // Perform optimistic update only for interpreters
      queryClient.setQueryData(['interpreters'], (oldData: any) => {
        if (!oldData) return oldData;
        
        return oldData.map((interpreter: any) => {
          if (interpreter.id === userId) {
            return { ...interpreter, ...transformedData };
          }
          return interpreter;
        });
      });

      // Perform actual update
      const { error } = await supabase
        .from('interpreter_profiles')
        .update(transformedData)
        .eq('id', userId);

      if (error) throw error;

      // Show success toast with shorter duration
      toast({
        title: "Profil mis à jour",
        description: "Le profil a été mis à jour avec succès",
        duration: 3000, // 3 seconds
      });

      return { success: true };
    } catch (error: any) {
      console.error('Profile update error:', error);
      
      // Revert optimistic update on error
      if (previousData) {
        queryClient.setQueryData(['interpreters'], previousData);
      }
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil: " + error.message,
        variant: "destructive",
        duration: 5000, // 5 seconds
      });
      
      return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, queryClient, toast]);

  return {
    updateProfile,
    isSubmitting
  };
};
