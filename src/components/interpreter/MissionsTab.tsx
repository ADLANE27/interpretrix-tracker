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
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
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

      const { data, error } = await supabase
        .from('interpretation_missions')
        .select('*')
        .or(`notified_interpreters.cs.{${user.id}},assigned_interpreter_id.eq.${user.id}`);

      if (error) throw error;
      setMissions(data || []);
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
          event: 'INSERT',
          schema: 'public',
          table: 'interpretation_missions'
        },
        (payload) => {
          const newMission = payload.new as Mission;
          toast({
            title: "Nouvelle mission disponible",
            description: `${newMission.source_language} → ${newMission.target_language}`,
          });
          fetchMissions(); // Refresh the missions list
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

      const { error } = await supabase
        .from('interpretation_missions')
        .update({
          status: accept ? 'accepted' : 'declined',
          assigned_interpreter_id: accept ? user.id : null,
          assignment_time: accept ? new Date().toISOString() : null
        })
        .eq('id', missionId);

      if (error) throw error;

      toast({
        title: accept ? "Mission acceptée" : "Mission déclinée",
        description: `La mission a été ${accept ? 'acceptée' : 'déclinée'} avec succès.`,
      });

      // Refresh missions list
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
            {mission.status === 'pending' && (
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
            {mission.status !== 'pending' && (
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