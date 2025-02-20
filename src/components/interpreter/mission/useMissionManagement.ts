
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mission } from '@/types/mission';

export const useMissionManagement = (onMissionsUpdate: () => void) => {
  const [isProcessing, setIsProcessing] = useState(false);
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
        const { error: declineError } = await supabase
          .from('interpretation_missions')
          .update({ 
            status: 'declined',
            notified_interpreters: [user.id]
          })
          .eq('id', missionId);

        if (declineError) {
          console.error('[useMissionManagement] Error declining mission:', declineError);
          throw declineError;
        }

        console.log('[useMissionManagement] Mission declined successfully');
      }

      onMissionsUpdate();
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

  return {
    isProcessing,
    handleMissionResponse
  };
};
