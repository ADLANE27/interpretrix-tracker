
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
  available: { 
    color: "bg-gradient-to-r from-green-400 to-emerald-500 text-white", 
    label: "Disponible" 
  },
  unavailable: { 
    color: "bg-gradient-to-r from-red-400 to-rose-500 text-white", 
    label: "Indisponible" 
  },
  pause: { 
    color: "bg-gradient-to-r from-amber-400 to-orange-500 text-white", 
    label: "En pause" 
  },
  busy: { 
    color: "bg-gradient-to-r from-indigo-400 to-purple-500 text-white", 
    label: "En appel" 
  },
};

export const InterpreterListItem = ({ interpreter }: InterpreterListItemProps) => {
  const parsedLanguages = interpreter.languages
    .map(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return { source, target };
    })
    .filter(lang => lang.source && lang.target);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-blue-300 hover:border-l-blue-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`px-3 py-1 rounded-full text-sm ${statusConfig[interpreter.status].color}`}>
            {statusConfig[interpreter.status].label}
          </div>
          <span className="font-medium truncate">{interpreter.name}</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap flex-1 justify-end">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <div className="flex flex-wrap gap-1">
              {parsedLanguages.map((lang, index) => (
                <div
                  key={index}
                  className="px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-100 text-blue-700 rounded-lg text-sm flex items-center gap-1 shadow-sm"
                >
                  <span>{lang.source}</span>
                  <span className="text-indigo-400">→</span>
                  <span>{lang.target}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-md">
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
