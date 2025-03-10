import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { UpcomingMissionBadge } from "@/components/UpcomingMissionBadge";

interface InterpreterListItemProps {
  interpreter: {
    id: string;
    name: string;
    status: "available" | "unavailable" | "pause" | "busy";
    employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "permanent_interpreter" | "self_employed";
    languages: string[];
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

const employmentStatusLabels: Record<string, string> = {
  salaried_aft: "Salarié AFTrad",
  salaried_aftcom: "Salarié AFTCOM",
  salaried_planet: "Salarié PLANET",
  permanent_interpreter: "Interprète permanent",
  permanent_interpreter_aftcom: "Interprète Permanent AFTcom",
  self_employed: "Externe",
};

export const InterpreterListItem = ({ interpreter }: InterpreterListItemProps) => {
  const parsedLanguages = interpreter.languages
    .map(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return { source, target };
    })
    .filter(lang => lang.source && lang.target);

  return (
    <Card className="p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Badge className={statusConfig[interpreter.status].color}>
            {statusConfig[interpreter.status].label}
          </Badge>
          <span className="font-medium truncate">{interpreter.name}</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap flex-1 justify-end">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-500" />
            <div className="flex flex-wrap gap-1">
              {parsedLanguages.map((lang, index) => (
                <div key={index} className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {lang.source} → {lang.target}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Badge variant="outline">
            {employmentStatusLabels[interpreter.employment_status]}
          </Badge>

          {interpreter.next_mission_start && (
            <UpcomingMissionBadge
              startTime={interpreter.next_mission_start}
              estimatedDuration={interpreter.next_mission_duration || 0}
            />
          )}
        </div>
      </div>
    </Card>
  );
};
