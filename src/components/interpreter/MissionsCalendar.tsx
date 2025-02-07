
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

interface Mission {
  id: string;
  source_language: string;
  target_language: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  client_name: string | null;
  estimated_duration: number;
  status: string;
}

interface MissionsCalendarProps {
  missions: Mission[];
}

type MissionPayload = RealtimePostgresChangesPayload<{
  [key: string]: any;
}>;

export const MissionsCalendar = ({ missions: initialMissions }: MissionsCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [missions, setMissions] = useState<Mission[]>(initialMissions);

  useEffect(() => {
    setMissions(initialMissions);
  }, [initialMissions]);

  useEffect(() => {
    console.log('[MissionsCalendar] Setting up realtime subscription');
    
    const channel = supabase
      .channel('calendar-missions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpretation_missions'
        },
        async (payload: MissionPayload) => {
          console.log('[MissionsCalendar] Mission update received:', payload);
          
          // Get the current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Fetch the updated mission to get its complete data
          const { data: updatedMission, error } = await supabase
            .from('interpretation_missions')
            .select('*')
            .eq('id', payload.new?.id)
            .single();

          if (error) {
            console.error('[MissionsCalendar] Error fetching updated mission:', error);
            return;
          }

          // Update missions list based on the change type
          setMissions(currentMissions => {
            switch (payload.eventType) {
              case 'INSERT':
                // Only add if it's for the current user and is accepted
                if (updatedMission.assigned_interpreter_id === user.id && updatedMission.status === 'accepted') {
                  return [...currentMissions, updatedMission];
                }
                return currentMissions;
              
              case 'UPDATE':
                return currentMissions.map(mission => 
                  mission.id === updatedMission.id ? updatedMission : mission
                );
              
              case 'DELETE':
                return currentMissions.filter(mission => 
                  mission.id !== (payload.old as { id: string })?.id
                );
              
              default:
                return currentMissions;
            }
          });
        }
      )
      .subscribe((status) => {
        console.log('[MissionsCalendar] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[MissionsCalendar] Successfully subscribed to changes');
        }
        
        if (status === 'CHANNEL_ERROR') {
          console.error('[MissionsCalendar] Error subscribing to changes');
        }
      });

    return () => {
      console.log('[MissionsCalendar] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter for only accepted missions that have scheduled times
  const scheduledMissions = missions.filter(
    (mission) => mission.status === 'accepted' && mission.scheduled_start_time
  );

  // Filter missions for the selected date
  const missionsForSelectedDate = scheduledMissions.filter((mission) => {
    if (!selectedDate || !mission.scheduled_start_time) return false;
    
    // Convert mission start time to local timezone for comparison
    const missionDate = new Date(mission.scheduled_start_time);
    const localMissionDate = new Date(missionDate.getTime() - (missionDate.getTimezoneOffset() * 60000));
    
    const selectedDayStart = startOfDay(selectedDate);
    const missionDayStart = startOfDay(localMissionDate);
    
    return selectedDayStart.getTime() === missionDayStart.getTime();
  });

  // Get all dates that have missions
  const datesWithMissions = scheduledMissions
    .map((mission) => {
      const missionDate = new Date(mission.scheduled_start_time!);
      // Convert to local timezone for display
      return startOfDay(new Date(missionDate.getTime() - (missionDate.getTimezoneOffset() * 60000)));
    });

  console.log('[MissionsCalendar] Scheduled missions:', scheduledMissions);
  console.log('[MissionsCalendar] Dates with missions:', datesWithMissions);
  console.log('[MissionsCalendar] Missions for selected date:', missionsForSelectedDate);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={fr}
          modifiers={{
            hasMission: datesWithMissions,
          }}
          modifiersStyles={{
            hasMission: {
              fontWeight: "bold",
              backgroundColor: "rgb(59 130 246 / 0.1)",
            },
          }}
          className="rounded-md border"
        />
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">
          {selectedDate
            ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
            : "Sélectionnez une date"}
        </h3>
        <div className="space-y-4">
          {missionsForSelectedDate.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucune mission programmée pour cette date
            </p>
          ) : (
            missionsForSelectedDate.map((mission) => {
              // Convert times to local timezone for display
              const startTime = new Date(mission.scheduled_start_time!);
              const endTime = mission.scheduled_end_time ? new Date(mission.scheduled_end_time) : null;
              
              const localStartTime = new Date(startTime.getTime() - (startTime.getTimezoneOffset() * 60000));
              const localEndTime = endTime ? new Date(endTime.getTime() - (endTime.getTimezoneOffset() * 60000)) : null;

              return (
                <Card key={mission.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">
                          {format(localStartTime, "HH:mm", { locale: fr })}
                          {localEndTime &&
                            ` - ${format(localEndTime, "HH:mm", { locale: fr })}`}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>
                          {mission.source_language} → {mission.target_language}
                        </p>
                        {mission.client_name && (
                          <p className="text-gray-500">{mission.client_name}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {mission.estimated_duration} min
                    </Badge>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
