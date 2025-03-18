import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startOfDay, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, User, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDateTimeDisplay, formatTimeString } from "@/utils/dateTimeUtils";

interface CalendarMission {
  mission_id: string;
  source_language: string;
  target_language: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  estimated_duration: number;
  client_name: string | null;
  status: string;
  interpreter_id: string;
  interpreter_first_name: string;
  interpreter_last_name: string;
  interpreter_status: string;
  profile_picture_url: string | null;
  mission_type: string;
}

type ViewMode = 'month' | 'week' | 'day';

export const AdminMissionsCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [missions, setMissions] = useState<CalendarMission[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const { toast } = useToast();

  const fetchMissions = async () => {
    try {
      console.log('[AdminMissionsCalendar] Fetching missions');
      const { data, error } = await supabase
        .from('calendar_missions')
        .select('*')
        .order('scheduled_start_time', { ascending: true });

      if (error) throw error;
      
      console.log('[AdminMissionsCalendar] Fetched missions:', data);
      setMissions(data);
    } catch (error) {
      console.error('[AdminMissionsCalendar] Error fetching missions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les missions",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    console.log('[AdminMissionsCalendar] Setting up realtime subscriptions');
    const channels = [];

    // Subscribe to changes in interpretation_missions
    const missionsChannel = supabase.channel('admin-calendar-missions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpretation_missions'
        },
        () => {
          console.log('[AdminMissionsCalendar] Mission update received');
          fetchMissions();
        }
      )
      .subscribe();
    channels.push(missionsChannel);

    // Subscribe to changes in private_reservations
    const reservationsChannel = supabase.channel('admin-calendar-reservations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_reservations'
        },
        () => {
          console.log('[AdminMissionsCalendar] Private reservation update received');
          fetchMissions();
        }
      )
      .subscribe();
    channels.push(reservationsChannel);

    fetchMissions();

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  const getVisibleMissions = () => {
    if (!selectedDate) return [];

    switch (viewMode) {
      case 'week': {
        const weekStart = startOfWeek(selectedDate, { locale: fr });
        const weekEnd = endOfWeek(selectedDate, { locale: fr });
        return missions.filter(mission => {
          if (!mission.scheduled_start_time) return false;
          const missionDate = new Date(mission.scheduled_start_time);
          return missionDate >= weekStart && missionDate <= weekEnd;
        });
      }
      case 'day':
      default: // month
        return missions.filter(mission => {
          if (!mission.scheduled_start_time) return false;
          const missionDate = new Date(mission.scheduled_start_time);
          return startOfDay(missionDate).getTime() === startOfDay(selectedDate).getTime();
        });
    }
  };

  const datesWithMissions = missions
    .filter(mission => mission.scheduled_start_time)
    .map((mission) => startOfDay(new Date(mission.scheduled_start_time!)))
    .filter((date): date is Date => date !== null);

  const visibleMissions = getVisibleMissions();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Calendrier des missions</h2>
        <div className="flex items-center gap-4">
          <Label htmlFor="view-mode">Vue</Label>
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger id="view-mode" className="w-[180px]">
              <SelectValue placeholder="Sélectionner une vue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Vue par mois</SelectItem>
              <SelectItem value="week">Vue par semaine</SelectItem>
              <SelectItem value="day">Vue par jour</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
              ? formatDateTimeDisplay(selectedDate.toISOString())
              : "Sélectionnez une date"}
          </h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {visibleMissions.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucune mission programmée pour cette date
              </p>
            ) : (
              visibleMissions.map((mission) => (
                <Card key={mission.mission_id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">
                          {formatTimeString(mission.scheduled_start_time)}
                          {" - "}
                          {formatTimeString(mission.scheduled_end_time)}
                        </span>
                        <Badge variant={mission.mission_type === 'private' ? "outline" : "secondary"}>
                          {mission.estimated_duration} min
                        </Badge>
                        {mission.mission_type === 'private' && (
                          <Badge variant="default">
                            Réservation privée
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Languages className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          {mission.source_language} → {mission.target_language}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">
                          {mission.interpreter_first_name} {mission.interpreter_last_name}
                        </span>
                      </div>

                      {mission.client_name && (
                        <p className="text-sm text-gray-500">
                          Client : {mission.client_name}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
