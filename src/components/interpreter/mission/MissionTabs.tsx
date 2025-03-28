
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mission } from "@/types/mission";
import { MissionCard } from "./MissionCard";
import { useMissionSubscription } from "./useMissionSubscription";
import { useMissionManagement } from "./useMissionManagement";
import { useMissionRealtime } from "@/hooks/useMissionRealtime";
import { useMissionUpdates } from "@/hooks/useMissionUpdates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MissionsTabHeader } from "./MissionsTabHeader";
import { EmptyMissionState } from "./EmptyMissionState";

export const MissionTabs = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Count for different mission types
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [upcomingCount, setUpcomingCount] = useState<number>(0);
  const [incomingCount, setIncomingCount] = useState<number>(0);

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
      
      // Calculate counts
      const now = new Date();
      const pendingMissions = missionsData.filter((mission) => mission.status === 'awaiting_acceptance');
      const acceptedUpcomingMissions = missionsData.filter((mission) => 
        mission.status === 'accepted' && 
        mission.scheduled_start_time && 
        new Date(mission.scheduled_start_time) > now
      );
      const acceptedIncomingMissions = missionsData.filter((mission) => 
        mission.status === 'accepted' && 
        mission.mission_type === 'immediate'
      );
      
      setPendingCount(pendingMissions.length);
      setUpcomingCount(acceptedUpcomingMissions.length);
      setIncomingCount(acceptedIncomingMissions.length);
      
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
  useMissionUpdates(fetchMissions); // Additional subscription for real-time updates

  useEffect(() => {
    console.log('[MissionsTab] Component mounted');
    fetchMissions();
  }, []);

  // Filter missions based on active tab
  const filteredMissions = missions.filter(mission => {
    const now = new Date();
    
    switch (activeTab) {
      case "pending":
        return mission.status === 'awaiting_acceptance';
      case "upcoming":
        return mission.status === 'accepted' && 
               mission.scheduled_start_time && 
               new Date(mission.scheduled_start_time) > now;
      case "incoming":
        return mission.status === 'accepted' && 
               (mission.mission_type === 'immediate' || 
                (mission.scheduled_start_time && new Date(mission.scheduled_start_time) <= now));
      default:
        return true; // "all" tab
    }
  });

  // Check if there are no missions at all
  const noMissions = missions.length === 0;
  // Check if there are no missions in the current filtered view
  const noFilteredMissions = filteredMissions.length === 0;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <MissionsTabHeader 
          activeTab={activeTab}
          missionsCount={missions.length}
          pendingCount={pendingCount}
          upcomingCount={upcomingCount}
          incomingCount={incomingCount}
        />

        <TabsContent value={activeTab} className="mt-0">
          {noMissions ? (
            <EmptyMissionState type="all" />
          ) : noFilteredMissions ? (
            <EmptyMissionState type="filtered" />
          ) : (
            filteredMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                currentUserId={currentUserId}
                isProcessing={isProcessing}
                onMissionResponse={handleMissionResponse}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
