import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, XSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Mission {
  id: string;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
  assigned_interpreter_id?: string;
  assigned_interpreter?: {
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
  };
}

export const MissionsTab = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchMissions();
    setupRealtimeSubscription();
  }, []);

  const transformMission = (rawMission: any): Mission => {
    return {
      id: rawMission.id,
      source_language: rawMission.source_language,
      target_language: rawMission.target_language,
      estimated_duration: rawMission.estimated_duration,
      status: rawMission.status,
      created_at: rawMission.created_at,
      assigned_interpreter_id: rawMission.assigned_interpreter_id,
      assigned_interpreter: rawMission.assigned_interpreter,
    };
  };

  const fetchMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: missionsData, error: missionsError } = await supabase
        .from('interpretation_missions')
        .select(`
          *,
          assigned_interpreter:interpreter_profiles!interpretation_missions_assigned_interpreter_id_fkey (
            first_name,
            last_name,
            profile_picture_url
          )
        `)
        .or(`notified_interpreters.cs.{${user.id}},assigned_interpreter_id.eq.${user.id}`);

      if (missionsError) throw missionsError;
      
      const transformedMissions = (missionsData || []).map(transformMission);
      console.log('Fetched missions:', transformedMissions);
      setMissions(transformedMissions);
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
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpretation_missions'
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          fetchMissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleMissionResponse = async (missionId: string, accept: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      if (accept) {
        // Update the mission status and assign the interpreter
        const { error: missionError } = await supabase
          .from('interpretation_missions')
          .update({
            status: 'accepted',
            assigned_interpreter_id: user.id,
            assignment_time: new Date().toISOString()
          })
          .eq('id', missionId);

        if (missionError) throw missionError;

        // Update local state immediately
        setMissions(prevMissions => 
          prevMissions.map(mission => 
            mission.id === missionId 
              ? { 
                  ...mission, 
                  status: 'accepted',
                  assigned_interpreter_id: user.id
                }
              : mission
          )
        );
      } else {
        // If declining, just update the notified_interpreters array to remove this interpreter
        const mission = missions.find(m => m.id === missionId);
        if (mission) {
          const updatedNotifiedInterpreters = (mission.notified_interpreters || [])
            .filter(id => id !== user.id);

          const { error: missionError } = await supabase
            .from('interpretation_missions')
            .update({
              notified_interpreters: updatedNotifiedInterpreters,
              status: 'declined'
            })
            .eq('id', missionId);

          if (missionError) throw missionError;

          // Update local state
          setMissions(prevMissions => 
            prevMissions.map(mission => 
              mission.id === missionId 
                ? { 
                    ...mission, 
                    status: 'declined',
                    notified_interpreters: updatedNotifiedInterpreters
                  }
                : mission
            )
          );
        }
      }

      toast({
        title: accept ? "Mission acceptée" : "Mission déclinée",
        description: `La mission a été ${accept ? 'acceptée' : 'déclinée'} avec succès.`,
      });

      // Refresh missions to get updated data
      fetchMissions();

    } catch (error) {
      console.error('Error updating mission:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du traitement de votre demande.",
        variant: "destructive",
      });
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
                {mission.assigned_interpreter && (
                  <div className="mt-2 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={mission.assigned_interpreter.profile_picture_url || undefined} />
                      <AvatarFallback>
                        {mission.assigned_interpreter.first_name[0]}
                        {mission.assigned_interpreter.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600">
                      Acceptée par {mission.assigned_interpreter.first_name} {mission.assigned_interpreter.last_name}
                    </span>
                  </div>
                )}
              </div>
              {mission.status === 'awaiting_acceptance' && (
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