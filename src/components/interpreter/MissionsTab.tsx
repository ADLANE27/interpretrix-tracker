import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, XSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Mission {
  id: string;
  client_name: string | null;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
  assigned_interpreter_id: string | null;
  assignment_time: string | null;
}

export const MissionsTab = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchMissions();
    setupRealtimeSubscription();
  }, []);

  const fetchMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      const { data: missionsData, error: missionsError } = await supabase
        .from('interpretation_missions')
        .select('*')
        .or(`notified_interpreters.cs.{${user.id}},assigned_interpreter_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (missionsError) {
        console.error('Error fetching missions:', missionsError);
        throw missionsError;
      }
      
      console.log('Fetched missions:', missionsData);
      setMissions(missionsData || []);
    } catch (error) {
      console.error('Error fetching missions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les missions",
        variant: "destructive",
      });
    }
  };

  const setupRealtimeSubscription = () => {
    console.log('Setting up realtime subscription');
    const channel = supabase
      .channel('mission-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpretation_missions'
        },
        (payload) => {
          console.log('Mission update received:', payload);
          fetchMissions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_notifications'
        },
        (payload) => {
          console.log('Notification update received:', payload);
          fetchMissions();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  };

  const handleMissionResponse = async (missionId: string, accept: boolean) => {
    if (isProcessing) {
      console.log('Already processing a request');
      toast({
        title: "Action en cours",
        description: "Veuillez patienter pendant le traitement de votre demande",
      });
      return;
    }

    try {
      setIsProcessing(true);
      console.log(`Processing mission response: ${accept ? 'accept' : 'decline'} for mission ${missionId}`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        throw new Error("Non authentifié");
      }

      if (accept) {
        console.log('Calling handle_mission_acceptance RPC');
        const { error: updateError } = await supabase.rpc('handle_mission_acceptance', {
          p_mission_id: missionId,
          p_interpreter_id: user.id
        });

        if (updateError) {
          console.error('Error in handle_mission_acceptance:', updateError);
          if (updateError.message.includes('Interpreter is not available')) {
            throw new Error("Vous n'êtes plus disponible pour accepter des missions");
          } else if (updateError.message.includes('Mission is no longer available')) {
            throw new Error("Cette mission n'est plus disponible");
          }
          throw updateError;
        }

        console.log('Mission accepted successfully');
        toast({
          title: "Mission acceptée",
          description: "Vous avez accepté la mission avec succès",
        });
      } else {
        console.log('Declining mission');
        const { error: declineError } = await supabase
          .from('mission_notifications')
          .update({ 
            status: 'declined',
            updated_at: new Date().toISOString()
          })
          .eq('mission_id', missionId)
          .eq('interpreter_id', user.id);

        if (declineError) {
          console.error('Error declining mission:', declineError);
          throw declineError;
        }

        console.log('Mission declined successfully');
        toast({
          title: "Mission déclinée",
          description: "Vous avez décliné la mission",
        });
      }

      fetchMissions();
    } catch (error) {
      console.error('Error updating mission:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors du traitement de votre demande",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getMissionStatusDisplay = (status: string) => {
    switch (status) {
      case 'accepted':
        return { label: 'Acceptée', variant: 'default' as const };
      case 'declined':
        return { label: 'Déclinée', variant: 'secondary' as const };
      case 'awaiting_acceptance':
        return { label: 'En attente d\'acceptation', variant: 'secondary' as const };
      default:
        return { label: status, variant: 'secondary' as const };
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Propositions de missions</h2>
      {missions.map((mission) => {
        const statusDisplay = getMissionStatusDisplay(mission.status);
        
        return (
          <Card key={mission.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <p>Date: {new Date(mission.created_at).toLocaleDateString()}</p>
                  <p>Durée: {mission.estimated_duration} minutes</p>
                  <p>Langues: {mission.source_language} → {mission.target_language}</p>
                </div>
                <Badge 
                  variant={statusDisplay.variant}
                  className="mt-2"
                >
                  {statusDisplay.label}
                </Badge>
              </div>
              {mission.status === 'awaiting_acceptance' && !isProcessing && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => handleMissionResponse(mission.id, true)}
                  >
                    <CheckSquare className="h-4 w-4" />
                    Accepter
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => handleMissionResponse(mission.id, false)}
                  >
                    <XSquare className="h-4 w-4" />
                    Décliner
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
