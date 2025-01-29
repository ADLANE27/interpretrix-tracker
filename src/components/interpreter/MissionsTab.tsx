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
      if (!user) return;

      // Fetch only missions where:
      // 1. The interpreter is notified
      // 2. The mission is still awaiting acceptance
      // 3. The interpreter is not busy with another mission
      const { data: missionsData, error: missionsError } = await supabase
        .from('interpretation_missions')
        .select('*')
        .or(`notified_interpreters.cs.{${user.id}},assigned_interpreter_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

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
    if (isProcessing) {
      toast({
        title: "Action en cours",
        description: "Veuillez patienter pendant le traitement de votre demande",
      });
      return;
    }

    try {
      setIsProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // 1. Vérifier que l'interprète est toujours disponible
      const { data: interpreterProfile } = await supabase
        .from('interpreter_profiles')
        .select('status')
        .eq('id', user.id)
        .single();

      if (!interpreterProfile || interpreterProfile.status !== 'available') {
        toast({
          title: "Non disponible",
          description: "Vous n'êtes plus disponible pour accepter des missions",
          variant: "destructive",
        });
        return;
      }

      // 2. Vérifier que la mission est toujours en attente
      const { data: currentMission } = await supabase
        .from('interpretation_missions')
        .select('status')
        .eq('id', missionId)
        .single();

      if (!currentMission || currentMission.status !== 'awaiting_acceptance') {
        toast({
          title: "Mission non disponible",
          description: "Cette mission n'est plus disponible",
          variant: "destructive",
        });
        return;
      }

      if (accept) {
        // 3. Accepter la mission et mettre à jour le statut de l'interprète
        const updates = {
          status: 'accepted',
          assigned_interpreter_id: user.id,
          assignment_time: new Date().toISOString(),
          notified_interpreters: [] // Effacer la liste des interprètes notifiés
        };

        const { error: missionError } = await supabase
          .from('interpretation_missions')
          .update(updates)
          .eq('id', missionId);

        if (missionError) throw missionError;

        // 4. Mettre à jour le statut de l'interprète à "busy"
        const { error: interpreterError } = await supabase
          .from('interpreter_profiles')
          .update({ status: 'busy' })
          .eq('id', user.id);

        if (interpreterError) throw interpreterError;

        // 5. Annuler toutes les autres notifications pour cet interprète
        const { error: notificationError } = await supabase
          .from('mission_notifications')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .neq('mission_id', missionId)
          .eq('interpreter_id', user.id);

        if (notificationError) throw notificationError;

        toast({
          title: "Mission acceptée",
          description: "Vous avez accepté la mission avec succès",
        });
      } else {
        // Décliner la mission
        const { error: notificationError } = await supabase
          .from('mission_notifications')
          .update({ 
            status: 'declined',
            updated_at: new Date().toISOString()
          })
          .eq('mission_id', missionId)
          .eq('interpreter_id', user.id);

        if (notificationError) throw notificationError;

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
        description: "Une erreur est survenue lors du traitement de votre demande",
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