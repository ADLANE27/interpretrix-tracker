
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
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

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

type InterpretationMission = Database['public']['Tables']['interpretation_missions']['Row'];
type MissionPayload = RealtimePostgresChangesPayload<InterpretationMission>;

export const MissionsCalendar = ({ missions: initialMissions }: MissionsCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [missions, setMissions] = useState<Mission[]>(initialMissions);
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          if (!payload.new && payload.eventType !== 'DELETE') {
            console.log('[MissionsCalendar] Invalid payload received:', payload);
            return;
          }

          if (payload.eventType !== 'DELETE') {
            const { data: updatedMission, error } = await supabase
              .from('interpretation_missions')
              .select('*')
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('[MissionsCalendar] Error fetching updated mission:', error);
              return;
            }

            setMissions(currentMissions => {
              switch (payload.eventType) {
                case 'INSERT':
                  if (updatedMission.assigned_interpreter_id === user.id && updatedMission.status === 'accepted') {
                    return [...currentMissions, updatedMission];
                  }
                  return currentMissions;
                
                case 'UPDATE':
                  return currentMissions.map(mission => 
                    mission.id === updatedMission.id ? updatedMission : mission
                  );
                
                default:
                  return currentMissions;
              }
            });
          } else if (payload.old?.id) {
            setMissions(currentMissions => 
              currentMissions.filter(mission => mission.id !== payload.old?.id)
            );
          }
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

  const scheduledMissions = missions.filter(
    (mission) => mission.status === 'accepted' && mission.scheduled_start_time
  );

  const missionsForSelectedDate = scheduledMissions.filter((mission) => {
    if (!selectedDate || !mission.scheduled_start_time) return false;
    
    const missionDate = toZonedTime(new Date(mission.scheduled_start_time), userTimeZone);
    const selectedDayStart = startOfDay(selectedDate);
    const missionDayStart = startOfDay(missionDate);
    
    return selectedDayStart.getTime() === missionDayStart.getTime();
  });

  const datesWithMissions = scheduledMissions
    .map((mission) => {
      if (!mission.scheduled_start_time) return null;
      return startOfDay(toZonedTime(new Date(mission.scheduled_start_time), userTimeZone));
    })
    .filter((date): date is Date => date !== null);

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
              const startTime = toZonedTime(new Date(mission.scheduled_start_time!), userTimeZone);
              const endTime = mission.scheduled_end_time 
                ? toZonedTime(new Date(mission.scheduled_end_time), userTimeZone)
                : null;

              return (
                <Card key={mission.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">
                          {formatInTimeZone(startTime, userTimeZone, "HH:mm")}
                          {endTime &&
                            ` - ${formatInTimeZone(endTime, userTimeZone, "HH:mm")}`}
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
