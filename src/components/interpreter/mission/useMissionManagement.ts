
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mission } from "@/types/mission";

export const useMissionManagement = (onUpdate: () => void) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  const handleMissionResponse = async (missionId: string, accept: boolean) => {
    if (isProcessing) {
      console.log('[useMissionManagement] Already processing a request');
      return;
    }

    try {
      setIsProcessing(true);
      console.log(`[useMissionManagement] Processing mission response: ${accept ? 'accept' : 'decline'} for mission ${missionId}`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[useMissionManagement] No user found');
        throw new Error("Non authentifié");
      }

      if (accept) {
        console.log('[useMissionManagement] Calling handle_mission_acceptance RPC');
        const { error: updateError } = await supabase.rpc('handle_mission_acceptance', {
          p_mission_id: missionId,
          p_interpreter_id: user.id
        });

        if (updateError) {
          console.error('[useMissionManagement] Error in handle_mission_acceptance:', updateError);
          if (updateError.message.includes('Interpreter is not available')) {
            throw new Error("Vous n'êtes plus disponible pour accepter des missions");
          } else if (updateError.message.includes('Mission is no longer available')) {
            throw new Error("Cette mission n'est plus disponible");
          }
          throw updateError;
        }

        console.log('[useMissionManagement] Mission accepted successfully');
      } else {
        console.log('[useMissionManagement] Declining mission');
        const { error: declineError } = await supabase.rpc('handle_mission_decline', {
          p_mission_id: missionId,
          p_interpreter_id: user.id
        });

        if (declineError) {
          console.error('[useMissionManagement] Error declining mission:', declineError);
          throw declineError;
        }

        console.log('[useMissionManagement] Mission declined successfully');
      }

      onUpdate();
    } catch (error: any) {
      console.error('[useMissionManagement] Error updating mission:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to sort interpreters alphabetically by name
  const sortInterpretersAlphabetically = (interpreters: any[]) => {
    return [...interpreters].sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  return {
    isProcessing,
    handleMissionResponse,
    sortInterpretersAlphabetically
  };
};
