
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

  const fetchMissions = async (userId: string) => {
    console.log('[MissionsCalendar] Fetching missions for user:', userId);
    const { data: missionsData, error } = await supabase
      .from('interpretation_missions')
      .select('*')
      .or('assigned_interpreter_id.eq.' + userId + ',notified_interpreters.cs.{' + userId + '}')
      .order('scheduled_start_time', { ascending: true });

    if (error) {
      console.error('[MissionsCalendar] Error fetching missions:', error);
      return;
    }

    console.log('[MissionsCalendar] Fetched missions:', missionsData);
    if (missionsData) {
      setMissions(missionsData);
      
      if (selectedDate && missionsData.some(mission => {
        if (!mission.scheduled_start_time) return false;
        const missionDate = toZonedTime(new Date(mission.scheduled_start_time), userTimeZone);
        return startOfDay(missionDate).getTime() === startOfDay(selectedDate).getTime();
      })) {
        console.log('[MissionsCalendar] New missions found for selected date');
      }
    }
  };

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

            if (payload.eventType === 'UPDATE' && payload.new.status === 'accepted') {
              if (payload.new.assigned_interpreter_id === user.id) {
                console.log('[MissionsCalendar] Mission accepted by current user:', payload.new);
                
                setMissions(prevMissions => {
                  const exists = prevMissions.some(m => m.id === payload.new.id);
                  if (!exists) {
                    return [...prevMissions, payload.new as Mission];
                  }
                  return prevMissions.map(m => 
                    m.id === payload.new.id ? payload.new as Mission : m
                  );
                });

                toast({
                  title: "Mission acceptée",
                  description: "Une nouvelle mission a été ajoutée à votre calendrier",
                });
              }
            }

            await fetchMissions(user.id);
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
  }, [selectedDate]);

  const scheduledMissions = missions.filter(mission => {
    const isAccepted = mission.status === 'accepted';
    const hasScheduledTime = mission.scheduled_start_time !== null;
    console.log(`[MissionsCalendar] Mission ${mission.id} - accepted: ${isAccepted}, hasScheduledTime: ${hasScheduledTime}`);
    return isAccepted && hasScheduledTime;
  });

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

  return (
    <div className="flex flex-col md:grid md:grid-cols-2 gap-4 p-4">
      <Card className="p-4 order-2 md:order-1">
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
          className="w-full max-w-full rounded-md border"
          classNames={{
            months: "w-full flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "w-full space-y-4",
            caption: "flex justify-center pt-1 relative items-center text-sm sm:text-base",
            caption_label: "text-sm sm:text-base font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: "h-7 w-7 sm:h-8 sm:w-8 p-0",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-8 sm:w-9 font-normal text-[0.8rem] sm:text-sm",
            row: "flex w-full mt-2",
            cell: "relative p-0 text-center text-sm rounded-md h-8 w-8 sm:h-9 sm:w-9 hover:bg-accent hover:text-accent-foreground focus-within:relative focus-within:z-20",
            day: "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "text-muted-foreground opacity-50",
            day_disabled: "text-muted-foreground opacity-50",
            day_hidden: "invisible",
          }}
        />
      </Card>

      <Card className="p-4 order-1 md:order-2">
        <h3 className="font-semibold mb-4 text-sm sm:text-base">
          {selectedDate
            ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
            : "Sélectionnez une date"}
        </h3>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto hide-scrollbar">
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
                <Card key={mission.id} className="p-3 touch-feedback">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm font-medium">
                          {formatInTimeZone(startTime, userTimeZone, "HH:mm")}
                          {endTime &&
                            ` - ${formatInTimeZone(endTime, userTimeZone, "HH:mm")}`}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p className="truncate">
                          {mission.source_language} → {mission.target_language}
                        </p>
                        {mission.client_name && (
                          <p className="text-gray-500 truncate">{mission.client_name}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">
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
