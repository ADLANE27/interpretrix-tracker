
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mission } from "@/types/mission";
import { MissionCard } from "./mission/MissionCard";
import { useMissionSubscription } from "./mission/useMissionSubscription";
import { useMissionManagement } from "./mission/useMissionManagement";
import { format, addHours } from "date-fns";
import { fr } from 'date-fns/locale';

export const MissionsTab = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const adjustForFrenchTime = (dateString: string) => {
    const date = new Date(dateString);
    return addHours(date, -1); // Subtract one hour to compensate for UTC to French time
  };

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

      // Adjust the times for French timezone before setting the missions
      const adjustedMissions = (missionsData as Mission[]).map(mission => ({
        ...mission,
        scheduled_start_time: mission.scheduled_start_time ? adjustForFrenchTime(mission.scheduled_start_time).toISOString() : null,
        scheduled_end_time: mission.scheduled_end_time ? adjustForFrenchTime(mission.scheduled_end_time).toISOString() : null
      }));

      setMissions(adjustedMissions);
      
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
