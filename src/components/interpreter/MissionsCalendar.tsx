
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock } from "lucide-react";

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

export const MissionsCalendar = ({ missions }: MissionsCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Filter missions for the selected date
  const missionsForSelectedDate = missions.filter((mission) => {
    if (!selectedDate || !mission.scheduled_start_time) return false;
    
    // Convert mission start time to local timezone for comparison
    const missionDate = new Date(mission.scheduled_start_time);
    const localMissionDate = new Date(missionDate.getTime() - (missionDate.getTimezoneOffset() * 60000));
    
    const selectedDayStart = startOfDay(selectedDate);
    const missionDayStart = startOfDay(localMissionDate);
    
    return selectedDayStart.getTime() === missionDayStart.getTime();
  });

  // Get all dates that have missions
  const datesWithMissions = missions
    .filter((mission) => mission.scheduled_start_time)
    .map((mission) => {
      const missionDate = new Date(mission.scheduled_start_time!);
      // Convert to local timezone for display
      return startOfDay(new Date(missionDate.getTime() - (missionDate.getTimezoneOffset() * 60000)));
    });

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

