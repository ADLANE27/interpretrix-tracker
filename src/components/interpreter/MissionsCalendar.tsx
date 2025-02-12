
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

  // Mettre à jour les missions quand les props changent
  useEffect(() => {
    console.log('[MissionsCalendar] Initial missions received:', initialMissions);
    setMissions(initialMissions);
  }, [initialMissions]);

  // Charger les missions directement depuis Supabase
  const fetchMissions = async (userId: string) => {
    const { data, error } = await supabase
      .from('interpretation_missions')
      .select('*')
      .eq('assigned_interpreter_id', userId)
      .eq('status', 'accepted')
      .not('scheduled_start_time', 'is', null);

    if (error) {
      console.error('[MissionsCalendar] Error fetching missions:', error);
      return;
    }

    console.log('[MissionsCalendar] Fetched missions:', data);
    if (data) {
      setMissions(data);
    }
  };

  // Configurer la souscription en temps réel
  useEffect(() => {
    console.log('[MissionsCalendar] Setting up realtime subscription');
    
    let userId: string | undefined;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      userId = user.id;
      await fetchMissions(user.id);

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
            
            if (userId) {
              await fetchMissions(userId);
            }
          }
        )
        .subscribe((status) => {
          console.log('[MissionsCalendar] Subscription status:', status);
        });

      return () => {
        console.log('[MissionsCalendar] Cleaning up realtime subscription');
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeSubscription();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, []);

  const scheduledMissions = missions.filter(
    (mission) => {
      const isAccepted = mission.status === 'accepted';
      const hasScheduledTime = mission.scheduled_start_time !== null;
      console.log(`[MissionsCalendar] Mission ${mission.id} - accepted: ${isAccepted}, hasScheduledTime: ${hasScheduledTime}`);
      return isAccepted && hasScheduledTime;
    }
  );

  const missionsForSelectedDate = scheduledMissions.filter((mission) => {
    if (!selectedDate || !mission.scheduled_start_time) return false;
    
    const missionDate = toZonedTime(new Date(mission.scheduled_start_time), userTimeZone);
    const selectedDayStart = startOfDay(selectedDate);
    const missionDayStart = startOfDay(missionDate);
    
    const matches = selectedDayStart.getTime() === missionDayStart.getTime();
    console.log(`[MissionsCalendar] Checking mission ${mission.id} for date ${selectedDate.toISOString()} - matches: ${matches}`);
    
    return matches;
  });

  const datesWithMissions = scheduledMissions
    .map((mission) => {
      if (!mission.scheduled_start_time) return null;
      const date = startOfDay(toZonedTime(new Date(mission.scheduled_start_time), userTimeZone));
      console.log(`[MissionsCalendar] Mission ${mission.id} date: ${date.toISOString()}`);
      return date;
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
