import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mission } from "@/types/mission";
import { MissionCard } from "./mission/MissionCard";
import { useMissionSubscription } from "./mission/useMissionSubscription";
import { useMissionManagement } from "./mission/useMissionManagement";
import { useMissionRealtime } from "@/hooks/useMissionRealtime";
import { useMissionUpdates } from "@/hooks/useMissionUpdates";
import { Box, CalendarClock, Clock, Inbox, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

export const MissionsTab = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("all");
  const isMobile = useIsMobile();
  
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
      
      setMissions(missionsData as Mission[]);
      
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

  const { isProcessing, handleMissionResponse, sortInterpretersAlphabetically } = useMissionManagement(fetchMissions);
  useMissionSubscription(currentUserId, fetchMissions);
  useMissionUpdates(fetchMissions); // Additional subscription for real-time updates

  useEffect(() => {
    console.log('[MissionsTab] Component mounted');
    fetchMissions();
  }, []);

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

  const noMissions = missions.length === 0;
  const noFilteredMissions = filteredMissions.length === 0;

  const renderTabTrigger = (value: string, icon: React.ReactNode, label: string, count?: number) => {
    if (isMobile) {
      return (
        <TabsTrigger value={value} className="px-2 py-1.5">
          <div className="flex flex-col items-center">
            {icon}
            {count !== undefined && count > 0 && (
              <Badge variant={value === "pending" ? "destructive" : "default"} 
                className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0 text-[10px]">
                {count}
              </Badge>
            )}
          </div>
        </TabsTrigger>
      );
    }
    
    return (
      <TabsTrigger value={value}>
        <div className="flex items-center gap-1">
          {icon}
          <span>{label}</span>
          {count !== undefined && count > 0 && (
            <Badge variant={value === "pending" ? "destructive" : "default"} className="ml-1">{count}</Badge>
          )}
        </div>
      </TabsTrigger>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          {renderTabTrigger("all", 
            <Box className={isMobile ? "h-5 w-5" : "h-4 w-4"} />, 
            "Toutes", 
            missions.length)}
          
          {renderTabTrigger("pending", 
            <Inbox className={isMobile ? "h-5 w-5" : "h-4 w-4"} />, 
            "En attente", 
            pendingCount)}
          
          {renderTabTrigger("upcoming", 
            <CalendarClock className={isMobile ? "h-5 w-5" : "h-4 w-4"} />, 
            "À venir", 
            upcomingCount)}
          
          {renderTabTrigger("incoming", 
            <Clock className={isMobile ? "h-5 w-5" : "h-4 w-4"} />, 
            "Immédiates", 
            incomingCount)}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {noMissions ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <Box className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Aucune mission disponible</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Vous n'avez actuellement aucune mission à traiter.
              </p>
            </div>
          ) : noFilteredMissions ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Aucune mission dans cette catégorie</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Consultez les autres onglets pour voir vos missions.
              </p>
            </div>
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
