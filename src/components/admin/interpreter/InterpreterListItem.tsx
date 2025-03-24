
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Home, Building } from "lucide-react";
import { UpcomingMissionBadge } from "@/components/UpcomingMissionBadge";
import { EmploymentStatus, employmentStatusLabels } from "@/utils/employmentStatus";
import { Profile } from "@/types/profile";
import { WorkLocation, workLocationLabels } from "@/utils/workLocationStatus";
import { InterpreterStatusDropdown } from "./InterpreterStatusDropdown";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
  onStatusChange?: (interpreterId: string, newStatus: Profile['status']) => void;
}

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

export const InterpreterListItem = ({ interpreter, onStatusChange }: InterpreterListItemProps) => {
  const [interpreterStatus, setInterpreterStatus] = useState<Profile['status']>(interpreter.status);
  const { toast } = useToast();
  const [statusUpdateAttempts, setStatusUpdateAttempts] = useState(0);

  // Update local state when props change
  useEffect(() => {
    if (interpreter.status !== interpreterStatus) {
      console.log(`[InterpreterListItem] Status updated from props for ${interpreter.id}:`, interpreter.status);
      setInterpreterStatus(interpreter.status);
      // Reset status update attempts counter when status is updated from props
      setStatusUpdateAttempts(0);
    }
  }, [interpreter.status, interpreter.id, interpreterStatus]);

  const handleStatusChange = (newStatus: Profile['status']) => {
    console.log(`[InterpreterListItem] Status change requested for ${interpreter.id}:`, newStatus);
    
    // Update local state immediately for responsive UI
    setInterpreterStatus(newStatus);
    
    if (onStatusChange) {
      // Track status update attempts
      setStatusUpdateAttempts(prev => prev + 1);
      
      // If there were previous failed attempts, show recovery message
      if (statusUpdateAttempts > 0) {
        toast({
          title: "Nouvelle tentative",
          description: `Tentative de mise à jour du statut en cours...`,
        });
      }
      
      onStatusChange(interpreter.id, newStatus)
        .catch(error => {
          console.error(`[InterpreterListItem] Error updating status:`, error);
          // Toast is displayed by the parent component that handles onStatusChange
          
          // If there have been multiple failed attempts, show guidance
          if (statusUpdateAttempts >= 2) {
            toast({
              title: "Problème de connexion",
              description: "Des problèmes de connexion persistent. Essayez de rafraîchir la page.",
              duration: 5000,
            });
          }
        });
    }
  };

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
            <InterpreterStatusDropdown 
              interpreterId={interpreter.id}
              currentStatus={interpreterStatus}
              displayFormat="badge"
              onStatusChange={handleStatusChange}
            />
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
