
import { Card } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { UpcomingMissionBadge } from "@/components/UpcomingMissionBadge";
import { EmploymentStatus, employmentStatusLabels } from "@/utils/employmentStatus";
import { Profile } from "@/types/profile";

interface InterpreterListItemProps {
  interpreter: {
    id: string;
    name: string;
    status: Profile['status'];
    employment_status: EmploymentStatus;
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

export const InterpreterListItem = ({ interpreter }: InterpreterListItemProps) => {
  const parsedLanguages = interpreter.languages
    .map(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return { source, target };
    })
    .filter(lang => lang.source && lang.target);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`px-3 py-1 rounded-full text-sm ${statusConfig[interpreter.status].color}`}>
            {statusConfig[interpreter.status].label}
          </div>
          <span className="font-medium truncate">{interpreter.name}</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap flex-1 justify-end">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {parsedLanguages.map((lang, index) => (
                <div
                  key={index}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center gap-1"
                >
                  <span>{lang.source}</span>
                  <span className="text-blue-400">→</span>
                  <span>{lang.target}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {employmentStatusLabels[interpreter.employment_status]}
          </div>

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
