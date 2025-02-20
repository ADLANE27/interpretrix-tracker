
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, XSquare, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useIsMobile } from "@/hooks/use-mobile";
import { Mission } from "@/types/mission";

export const MissionsTab = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectCountRef = useRef(0);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout>();

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
        .not('status', 'eq', 'declined')
        .order('created_at', { ascending: false });

      if (missionsError) {
        console.error('[MissionsTab] Error fetching missions:', missionsError);
        throw missionsError;
      }

      setMissions(missionsData as Mission[]);
      
    } catch (error) {
      console.error('[MissionsTab] Error fetching missions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les missions",
        variant: "destructive",
      });
    }
  };

  const setupRealtimeSubscription = () => {
    console.log('[MissionsTab] Setting up realtime subscription');
    
    const initializeChannel = () => {
      try {
        if (channelRef.current) {
          console.log('[MissionsTab] Removing existing channel');
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        supabase.realtime.disconnect();
        
        setTimeout(() => {
          channelRef.current = supabase
            .channel('interpreter-missions')
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'interpretation_missions'
              },
              (payload) => {
                console.log('[MissionsTab] Mission update received:', payload);
                
                if (!payload.new) {
                  console.log('[MissionsTab] No new mission data in payload');
                  return;
                }

                const mission = payload.new as Mission;
                
                if (!mission.notified_interpreters?.includes(currentUserId || '')) {
                  console.log('[MissionsTab] Current user not in notified interpreters');
                  return;
                }

                const isImmediate = mission.mission_type === 'immediate';
                
                if (!isMobile) {
                  console.log('[MissionsTab] Showing toast for new mission (desktop only)');
                  toast({
                    title: isImmediate ? "🚨 Nouvelle mission immédiate" : "📅 Nouvelle mission programmée",
                    description: `${mission.source_language} → ${mission.target_language} - ${mission.estimated_duration} minutes`,
                    variant: isImmediate ? "destructive" : "default",
                    duration: 10000,
                  });
                }
                
                void fetchMissions();
              }
            )
            .subscribe(async (status) => {
              console.log('[MissionsTab] Subscription status:', status);
              
              if (status === 'SUBSCRIBED') {
                console.log('[MissionsTab] Successfully subscribed to changes');
                reconnectCountRef.current = 0;
                if (visibilityTimeoutRef.current) {
                  clearTimeout(visibilityTimeoutRef.current);
                }
              }
            });
        }, 1000);
      } catch (error) {
        console.error('[MissionsTab] Error in initializeChannel:', error);
      }
    };

    initializeChannel();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[MissionsTab] App became visible');
        
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
        }
        
        visibilityTimeoutRef.current = setTimeout(() => {
          console.log('[MissionsTab] Reinitializing after visibility change');
          try {
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
            supabase.realtime.disconnect();
          } catch (error) {
            console.error('[MissionsTab] Error during cleanup:', error);
          }
          
          reconnectCountRef.current = 0;
          setTimeout(initializeChannel, 1000);
          fetchMissions();
        }, 1000);
      }
    };

    window.addEventListener("online", handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[MissionsTab] Cleaning up realtime subscription');
      window.removeEventListener("online", handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
      try {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
        supabase.realtime.disconnect();
      } catch (error) {
        console.error('[MissionsTab] Error during final cleanup:', error);
      }
    };
  };

  const handleMissionResponse = async (missionId: string, accept: boolean) => {
    if (isProcessing) {
      console.log('[MissionsTab] Already processing a request');
      return;
    }

    try {
      setIsProcessing(true);
      console.log(`[MissionsTab] Processing mission response: ${accept ? 'accept' : 'decline'} for mission ${missionId}`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[MissionsTab] No user found');
        throw new Error("Non authentifié");
      }

      if (accept) {
        console.log('[MissionsTab] Calling handle_mission_acceptance RPC');
        const { error: updateError } = await supabase.rpc('handle_mission_acceptance', {
          p_mission_id: missionId,
          p_interpreter_id: user.id
        });

        if (updateError) {
          console.error('[MissionsTab] Error in handle_mission_acceptance:', updateError);
          if (updateError.message.includes('Interpreter is not available')) {
            throw new Error("Vous n'êtes plus disponible pour accepter des missions");
          } else if (updateError.message.includes('Mission is no longer available')) {
            throw new Error("Cette mission n'est plus disponible");
          }
          throw updateError;
        }

        console.log('[MissionsTab] Mission accepted successfully');
      } else {
        console.log('[MissionsTab] Declining mission');
        const { error: declineError } = await supabase
          .from('interpretation_missions')
          .update({ 
            status: 'declined',
            notified_interpreters: [user.id]
          })
          .eq('id', missionId);

        if (declineError) {
          console.error('[MissionsTab] Error declining mission:', declineError);
          throw declineError;
        }

        setMissions(prevMissions => prevMissions.filter(m => m.id !== missionId));
        console.log('[MissionsTab] Mission declined successfully');
      }

      fetchMissions();
    } catch (error: any) {
      console.error('[MissionsTab] Error updating mission:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
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
    return cleanup;
  }, [toast, currentUserId]);

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

  return (
    <div className="space-y-4">
      {missions.map((mission) => {
        const statusDisplay = getMissionStatusDisplay(
          mission.status, 
          mission.assigned_interpreter_id
        );
        
        return (
          <Card key={mission.id} className="p-4">
            <div className="flex flex-col space-y-4">
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
              </div>
              {mission.status === 'awaiting_acceptance' && !isProcessing && (
                <div className="flex justify-center gap-2">
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
