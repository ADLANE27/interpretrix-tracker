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
  client_name: string | null;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
  assigned_interpreter_id: string | null;
  assignment_time: string | null;
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

      // Start a transaction using multiple updates
      const updates = {
        status: accept ? 'accepted' : 'declined',
        assigned_interpreter_id: accept ? user.id : null,
        assignment_time: accept ? new Date().toISOString() : null,
        notified_interpreters: [] // Clear the list when accepted
      };

      // Update the mission
      const { error: missionError } = await supabase
        .from('interpretation_missions')
        .update(updates)
        .eq('id', missionId);

      if (missionError) {
        console.error('Mission update error:', missionError);
        throw missionError;
      }

      // Update the notification status
      const { error: notificationError } = await supabase
        .from('mission_notifications')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('mission_id', missionId)
        .eq('interpreter_id', user.id);

      if (notificationError) {
        console.error('Notification update error:', notificationError);
        throw notificationError;
      }

      // If accepting, update interpreter status to busy
      if (accept) {
        const { error: interpreterError } = await supabase
          .from('interpreter_profiles')
          .update({ status: 'busy' })
          .eq('id', user.id);

        if (interpreterError) {
          console.error('Interpreter status update error:', interpreterError);
          throw interpreterError;
        }
      }

      toast({
        title: accept ? "Mission acceptée" : "Mission déclinée",
        description: `La mission a été ${accept ? 'acceptée' : 'déclinée'} avec succès.`,
      });

      // Refresh missions after all updates
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