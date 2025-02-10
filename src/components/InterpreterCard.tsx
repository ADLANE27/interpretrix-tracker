
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, Globe, Calendar, ArrowRightLeft } from "lucide-react";
import { UpcomingMissionBadge } from "./UpcomingMissionBadge";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';

interface InterpreterCardProps {
  interpreter: {
    id: string;
    name: string;
    status: "available" | "unavailable" | "pause" | "busy";
    type: "internal" | "external";
    languages: string[];
    hourlyRate?: number;
    phone_number?: string | null;
    next_mission_start?: string | null;
    next_mission_duration?: number | null;
  };
}

const statusConfig = {
  available: { color: "bg-interpreter-available text-white", label: "Disponible" },
  unavailable: { color: "bg-interpreter-unavailable text-white", label: "Indisponible" },
  pause: { color: "bg-interpreter-pause text-white", label: "En pause" },
  busy: { color: "bg-interpreter-busy text-white", label: "En appel" },
};

export const InterpreterCard = ({ interpreter }: InterpreterCardProps) => {
  const hasUpcomingMission = interpreter.next_mission_start && interpreter.next_mission_duration;

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{interpreter.name}</h3>
          <Badge variant="outline" className="mt-1">
            {interpreter.type === "internal" ? "Salarié" : "Freelance"}
          </Badge>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className={`${statusConfig[interpreter.status].color}`}>
            {statusConfig[interpreter.status].label}
          </Badge>
          {hasUpcomingMission && (
            <UpcomingMissionBadge
              startTime={interpreter.next_mission_start}
              estimatedDuration={interpreter.next_mission_duration}
            />
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-500" />
          <div className="flex flex-wrap gap-1">
            {interpreter.languages.map((lang, index) => {
              const [source, target] = lang.split(" → ");
              return (
                <div key={index} className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {source}
                  </Badge>
                  <span className="text-xs">→</span>
                  <Badge variant="secondary" className="text-xs">
                    {target}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {interpreter.phone_number && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{interpreter.phone_number}</span>
          </div>
        )}
        
        {interpreter.type === "external" && interpreter.hourlyRate && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{interpreter.hourlyRate}€/h</span>
          </div>
        )}

        {/* Mission Details Section */}
        {hasUpcomingMission && (
          <div className="mt-4 border-t pt-3 space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Prochaine mission</h4>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm">
                {format(new Date(interpreter.next_mission_start), "d MMMM à HH:mm", { locale: fr })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm">
                Durée: {interpreter.next_mission_duration} minutes
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
