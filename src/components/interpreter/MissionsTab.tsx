
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mission } from "@/types/mission";
import { MissionCard } from "./mission/MissionCard";
import { useMissionSubscription } from "./mission/useMissionSubscription";
import { useMissionManagement } from "./mission/useMissionManagement";

export const MissionsTab = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

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

      // Use the mission data directly without any parsing or conversion
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

  const { isProcessing, handleMissionResponse } = useMissionManagement(fetchMissions);
  useMissionSubscription(currentUserId, fetchMissions);

  useEffect(() => {
    console.log('[MissionsTab] Component mounted');
    fetchMissions();
  }, []);

  return (
    <div className="space-y-4">
      {missions.map((mission) => (
        <MissionCard
          key={mission.id}
          mission={mission}
          currentUserId={currentUserId}
          isProcessing={isProcessing}
          onMissionResponse={handleMissionResponse}
        />
      ))}
    </div>
  );
};
