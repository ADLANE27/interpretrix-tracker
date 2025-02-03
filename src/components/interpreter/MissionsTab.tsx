import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, XSquare, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  mission_type: 'immediate' | 'scheduled';
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
}

export const MissionsTab = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchMissions = async () => {
    try {
      console.log('[MissionsTab] Fetching missions');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[MissionsTab] No user found');
        return;
      }

      setCurrentUserId(user.id);

      const { data: missionsData, error: missionsError } = await supabase
        .from('interpretation_missions')
        .select('*')
        .or(`notified_interpreters.cs.{${user.id}},assigned_interpreter_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (missionsError) {
        console.error('[MissionsTab] Error fetching missions:', missionsError);
        throw missionsError;
      }

      const { data: notifications, error: notificationsError } = await supabase
        .from('mission_notifications')
        .select('mission_id, status')
        .eq('interpreter_id', user.id);

      if (notificationsError) {
        console.error('[MissionsTab] Error fetching notifications:', notificationsError);
        throw notificationsError;
      }

      const declinedMissions = new Set(
        notifications
          ?.filter(n => n.status === 'declined')
          .map(n => n.mission_id)
      );

      const filteredMissions = missionsData?.filter(
        mission => !declinedMissions.has(mission.id)
      ) || [];
      
      console.log('[MissionsTab] Fetched missions:', filteredMissions);
      setMissions(filteredMissions as Mission[]);
    } catch (error) {
      console.error('[MissionsTab] Error fetching missions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les missions",
        variant: "destructive",
      });
    }
  };

  const setupRealtimeSubscription = () => {
    console.log('[MissionsTab] Setting up realtime subscription');
    
    const channel = supabase
      .channel('interpreter-missions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpretation_missions'
        },
        (payload) => {
          console.log('[MissionsTab] Mission update received:', payload);
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
          console.log('[MissionsTab] Notification update received:', payload);
          fetchMissions();
        }
      )
      .subscribe((status) => {
        console.log('[MissionsTab] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[MissionsTab] Successfully subscribed to changes');
        }
        
        if (status === 'CHANNEL_ERROR') {
          console.error('[MissionsTab] Error subscribing to changes');
          toast({
            title: "Erreur",
            description: "Impossible de recevoir les mises à jour en temps réel",
            variant: "destructive",
          });
        }
      });

    return () => {
      console.log('[MissionsTab] Cleaning up realtime subscription');
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

        setMissions(prevMissions => prevMissions.filter(m => m.id !== missionId));

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

  useEffect(() => {
    console.log('[MissionsTab] Component mounted');
    fetchMissions();
    const cleanup = setupRealtimeSubscription();
    return () => {
      console.log('[MissionsTab] Component unmounting');
      cleanup();
    };
  }, []);

  const getMissionStatusDisplay = (status: string, assignedInterpreterId: string | null) => {
    if (status === 'accepted') {
      if (assignedInterpreterId === currentUserId) {
        return { label: 'Acceptée par vous', variant: 'default' as const };
      }
      return { label: 'Acceptée par un autre interprète', variant: 'secondary' as const };
    }
    
    switch (status) {
      case 'declined':
        return { label: 'Déclinée', variant: 'secondary' as const };
      case 'awaiting_acceptance':
        return { label: 'En attente d\'acceptation', variant: 'secondary' as const };
      default:
        return { label: status, variant: 'secondary' as const };
    }
  };

  const scheduledMissions = missions.filter(
    (mission) => 
      mission.mission_type === 'scheduled' && 
      mission.status === 'accepted' &&
      mission.assigned_interpreter_id
  );

  return (
    <div className="space-y-4">
      {missions.map((mission) => {
        const statusDisplay = getMissionStatusDisplay(mission.status, mission.assigned_interpreter_id);
        
        return (
          <Card key={mission.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  {mission.mission_type === 'scheduled' ? (
                    <Calendar className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-green-500" />
                  )}
                  <Badge variant={mission.mission_type === 'scheduled' ? 'secondary' : 'default'}>
                    {mission.mission_type === 'scheduled' ? 'Programmée' : 'Immédiate'}
                  </Badge>
                </div>
                
                <div className="text-sm text-gray-600">
                  {mission.mission_type === 'immediate' ? (
                    <>
                      <p>Date: {format(new Date(mission.created_at), "EEEE d MMMM yyyy", { locale: fr })}</p>
                      <p>Langues: {mission.source_language} → {mission.target_language}</p>
                      <p>Durée: {mission.estimated_duration} minutes</p>
                    </>
                  ) : mission.scheduled_start_time && (
                    <div className="space-y-1">
                      <p className="text-blue-600">
                        Début: {format(new Date(mission.scheduled_start_time), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                      {mission.scheduled_end_time && (
                        <p className="text-blue-600">
                          Fin: {format(new Date(mission.scheduled_end_time), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      )}
                      <p>Langues: {mission.source_language} → {mission.target_language}</p>
                      <p>Durée: {mission.estimated_duration} minutes</p>
                    </div>
                  )}
                </div>
                <Badge 
                  variant={statusDisplay.variant}
                  className={`mt-2 ${mission.status === 'accepted' && mission.assigned_interpreter_id === currentUserId ? 'bg-green-100 text-green-800' : ''}`}
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