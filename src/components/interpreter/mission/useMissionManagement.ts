
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mission } from '@/types/mission';

export const useMissionManagement = (onMissionsUpdate: () => void) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Vérifier périodiquement les missions programmées
  useEffect(() => {
    const checkScheduledMissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        
        // Chercher les missions programmées qui devraient démarrer
        const { data: missions, error } = await supabase
          .from('interpretation_missions')
          .select('*')
          .eq('assigned_interpreter_id', user.id)
          .eq('status', 'accepted')
          .eq('mission_type', 'scheduled')
          .lte('scheduled_start_time', now.toISOString())
          .gt('scheduled_end_time', now.toISOString());

        if (error) {
          console.error('[useMissionManagement] Error checking scheduled missions:', error);
          return;
        }

        // Mettre à jour le statut des missions qui doivent démarrer
        for (const mission of missions || []) {
          console.log('[useMissionManagement] Starting scheduled mission:', mission.id);
          const { error: updateError } = await supabase
            .from('interpretation_missions')
            .update({ status: 'in_progress' })
            .eq('id', mission.id);

          if (updateError) {
            console.error('[useMissionManagement] Error updating mission status:', updateError);
            continue;
          }

          toast({
            title: "Mission démarrée",
            description: `La mission programmée ${mission.source_language} → ${mission.target_language} a commencé`,
          });
        }

      } catch (error) {
        console.error('[useMissionManagement] Error in checkScheduledMissions:', error);
      }
    };

    // Vérifier toutes les minutes
    const interval = setInterval(checkScheduledMissions, 60000);
    checkScheduledMissions(); // Vérifier immédiatement au montage

    return () => clearInterval(interval);
  }, [toast]);

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
