
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimePostgresChangesPayload, RealtimeChannel } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { useToast } from "@/hooks/use-toast";

interface Mission {
  id: string;
  source_language: string;
  target_language: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  client_name: string | null;
  estimated_duration: number;
  status: string;
  assigned_interpreter_id: string | null;
  notified_interpreters: string[] | null;
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
  const { toast } = useToast();

  // Fetch all missions for the current user
  const fetchMissions = async (userId: string) => {
    console.log('[MissionsCalendar] Fetching missions for user:', userId);
    const { data: missionsData, error } = await supabase
      .from('interpretation_missions')
      .select('*')
      .or('assigned_interpreter_id.eq.' + userId + ',notified_interpreters.cs.{' + userId + '}')
      .order('scheduled_start_time', { ascending: true }); // Changed to order by start time

    if (error) {
      console.error('[MissionsCalendar] Error fetching missions:', error);
      return;
    }

    console.log('[MissionsCalendar] Fetched missions:', missionsData);
    if (missionsData) {
      setMissions(missionsData);
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    console.log('[MissionsCalendar] Setting up realtime subscription');
    let isSubscribed = true;

    const channelName = `calendar-missions-${Date.now()}`;
    console.log('[MissionsCalendar] Creating channel:', channelName);
    
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[MissionsCalendar] No authenticated user found');
        return;
      }

      // Initial fetch
      await fetchMissions(user.id);
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'interpretation_missions'
          },
          async (payload: MissionPayload) => {
            if (!isSubscribed) return;
            console.log('[MissionsCalendar] Mission update received:', payload);

            try {
              // Always refresh missions to ensure we have the latest state
              await fetchMissions(user.id);

              // Show toast for newly accepted missions
              if (payload.eventType === 'UPDATE' && 
                  payload.old?.status !== 'accepted' && 
                  payload.new.status === 'accepted' && 
                  payload.new.assigned_interpreter_id === user.id) {
                toast({
                  title: "Mission acceptée",
                  description: "Une nouvelle mission a été ajoutée à votre calendrier",
                });
              }
            } catch (error) {
              console.error('[MissionsCalendar] Error processing mission update:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('[MissionsCalendar] Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[MissionsCalendar] Successfully subscribed to channel:', channelName);
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('[MissionsCalendar] Channel error for:', channelName);
          }
        });

      return channel;
    };

    let channel: RealtimeChannel;
    setupSubscription().then(ch => {
      if (ch) channel = ch;
    });

    // Cleanup function
    return () => {
      console.log('[MissionsCalendar] Cleaning up subscription for channel:', channelName);
      isSubscribed = false;
      if (channel) {
        supabase.removeChannel(channel).then(() => {
          console.log('[MissionsCalendar] Channel removed successfully:', channelName);
        }).catch(error => {
          console.error('[MissionsCalendar] Error removing channel:', error);
        });
      }
    };
  }, []); // Empty dependency array ensures setup runs only once

  // Filter missions for the calendar view - only show accepted missions with scheduled times
  const scheduledMissions = missions.filter(mission => {
    const isAccepted = mission.status === 'accepted';
    const hasScheduledTime = mission.scheduled_start_time !== null;
    console.log(`[MissionsCalendar] Mission ${mission.id} - accepted: ${isAccepted}, hasScheduledTime: ${hasScheduledTime}`);
    return isAccepted && hasScheduledTime;
  });

  // Filter missions for the selected date
  const missionsForSelectedDate = scheduledMissions.filter((mission) => {
    if (!selectedDate || !mission.scheduled_start_time) return false;
    
    const missionDate = toZonedTime(new Date(mission.scheduled_start_time), userTimeZone);
    const selectedDayStart = startOfDay(selectedDate);
    const missionDayStart = startOfDay(missionDate);
    
    const matches = selectedDayStart.getTime() === missionDayStart.getTime();
    console.log(`[MissionsCalendar] Checking mission ${mission.id} for date ${selectedDate.toISOString()} - matches: ${matches}`);
    
    return matches;
  });

  // Get all dates that have missions
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
