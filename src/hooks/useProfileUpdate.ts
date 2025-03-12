
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
      previousData = queryClient.getQueryData(['users']);
      
      // Perform optimistic update
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

      // Perform actual update
      const { error } = await supabase
        .from('interpreter_profiles')
        .update(transformedData)
        .eq('id', userId);

      if (error) throw error;

      // Show success toast
      toast({
        title: "Profil mis à jour",
        description: "Le profil a été mis à jour avec succès",
      });

      // Trigger background refetch without awaiting
      queryClient.invalidateQueries({ queryKey: ['users'] });

      return { success: true };
    } catch (error: any) {
      console.error('Profile update error:', error);
      
      // Revert optimistic update on error
      if (previousData) {
        queryClient.setQueryData(['users'], previousData);
      }
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil: " + error.message,
        variant: "destructive",
      });
      
      // Trigger background refetch without awaiting
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      return { success: false, error };
    } finally {
      // Make sure we reset the submitting state
      setIsSubmitting(false);
    }
  }, [isSubmitting, queryClient, toast]);

  return {
    updateProfile,
    isSubmitting
  };
};
