import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, XSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Mission {
  id: string;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
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
      status: rawMission.mission_notifications?.[0]?.status || 'pending',
      created_at: rawMission.created_at,
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
          mission_notifications!inner (
            status,
            interpreter_id
          )
        `)
        .eq('mission_notifications.interpreter_id', user.id);

      if (missionsError) throw missionsError;
      
      const transformedMissions = (missionsData || []).map(mission => ({
        ...transformMission(mission),
        status: mission.mission_notifications[0]?.status || 'pending'
      }));

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
          table: 'mission_notifications'
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          fetchMissions(); // Refresh the missions list when notifications change
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

      // Update the notification status
      const { error: notificationError } = await supabase
        .from('mission_notifications')
        .update({
          status: accept ? 'accepted' : 'declined'
        })
        .eq('mission_id', missionId)
        .eq('interpreter_id', user.id);

      if (notificationError) throw notificationError;

      // If accepting, also update the mission status and assign the interpreter
      if (accept) {
        const { error: missionError } = await supabase
          .from('interpretation_missions')
          .update({
            status: 'accepted',
            assigned_interpreter_id: user.id,
            assignment_time: new Date().toISOString()
          })
          .eq('id', missionId);

        if (missionError) throw missionError;
      }

      // Update local state immediately
      setMissions(prevMissions => 
        prevMissions.map(mission => 
          mission.id === missionId 
            ? { ...mission, status: accept ? 'accepted' : 'declined' }
            : mission
        )
      );

      toast({
        title: accept ? "Mission acceptée" : "Mission déclinée",
        description: `La mission a été ${accept ? 'acceptée' : 'déclinée'} avec succès.`,
      });

    } catch (error) {
      console.error('Error updating mission:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du traitement de votre demande.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Propositions de missions</h2>
      {missions.map((mission) => (
        <Card key={mission.id} className="p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <p>Date: {new Date(mission.created_at).toLocaleDateString()}</p>
                <p>Durée: {mission.estimated_duration} minutes</p>
                <p>Langues: {mission.source_language} → {mission.target_language}</p>
              </div>
            </div>
            {mission.status === 'pending' ? (
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
            ) : (
              <Badge variant={mission.status === 'accepted' ? 'default' : 'secondary'}>
                {mission.status === 'accepted' ? 'Acceptée' : 'Déclinée'}
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};