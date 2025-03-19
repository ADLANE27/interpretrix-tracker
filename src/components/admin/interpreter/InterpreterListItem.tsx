
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Home, Building } from "lucide-react";
import { UpcomingMissionBadge } from "@/components/UpcomingMissionBadge";
import { EmploymentStatus, employmentStatusLabels } from "@/utils/employmentStatus";
import { Profile } from "@/types/profile";
import { WorkLocation, workLocationLabels } from "@/utils/workLocationStatus";

interface InterpreterListItemProps {
  interpreter: {
    id: string;
    name: string;
    status: Profile['status'];
    employment_status: EmploymentStatus;
    languages: string[];
    next_mission_start?: string | null;
    next_mission_duration?: number | null;
    work_location?: WorkLocation;
  };
}

const statusConfig = {
  available: { 
    color: "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm", 
    label: "Disponible" 
  },
  unavailable: { 
    color: "bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-sm", 
    label: "Indisponible" 
  },
  pause: { 
    color: "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm", 
    label: "En pause" 
  },
  busy: { 
    color: "bg-gradient-to-r from-indigo-400 to-purple-500 text-white shadow-sm", 
    label: "En appel" 
  },
};

const workLocationConfig = {
  remote: {
    color: "bg-purple-100 text-purple-800 border border-purple-300",
    icon: Home
  },
  on_site: {
    color: "bg-blue-100 text-blue-800 border border-blue-300",
    icon: Building
  }
};

export const InterpreterListItem = ({ interpreter }: InterpreterListItemProps) => {
  const parsedLanguages = interpreter.languages
    .map(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return { source, target };
    })
    .filter(lang => lang.source && lang.target);

  const workLocation = interpreter.work_location || "on_site";
  const LocationIcon = workLocationConfig[workLocation].icon;

  return (
    <Card className="p-4 hover-elevate gradient-border">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[interpreter.status].color}`}>
              {statusConfig[interpreter.status].label}
            </div>
            <span className="font-medium truncate text-gradient-primary">{interpreter.name}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap flex-1 justify-end">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-palette-ocean-blue" />
              <div className="flex flex-wrap gap-1">
                {parsedLanguages.map((lang, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded-lg text-sm flex items-center gap-1 shadow-sm"
                  >
                    <span>{lang.source}</span>
                    <span className="text-palette-vivid-purple">→</span>
                    <span>{lang.target}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-white font-medium bg-gradient-to-r from-palette-vivid-purple to-indigo-500 px-3 py-1 rounded-full shadow-sm">
              {employmentStatusLabels[interpreter.employment_status]}
            </div>

            <div className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${workLocationConfig[workLocation].color}`}>
              <LocationIcon className="h-3 w-3" />
              <span>{workLocationLabels[workLocation]}</span>
            </div>

            {interpreter.next_mission_start && (
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
