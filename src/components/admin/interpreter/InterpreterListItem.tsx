
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Home, Building, Phone, PhoneCall, Clock } from "lucide-react";
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
    phone_number?: string | null;
    booth_number?: string | null;
    private_phone?: string | null;
    professional_phone?: string | null;
    landline_phone?: string | null;
    work_hours?: {
      start_morning?: string;
      end_morning?: string;
      start_afternoon?: string;
      end_afternoon?: string;
    } | null;
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

  // Update local state when props change
  useEffect(() => {
    if (interpreter.status !== interpreterStatus) {
      console.log(`[InterpreterListItem] Status updated from props for ${interpreter.id}:`, interpreter.status);
      setInterpreterStatus(interpreter.status);
    }
  }, [interpreter.status, interpreter.id, interpreterStatus]);

  const handleStatusChange = (newStatus: Profile['status']) => {
    console.log(`[InterpreterListItem] Status change requested for ${interpreter.id}:`, newStatus);
    setInterpreterStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(interpreter.id, newStatus);
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
  
  const hasAnyPhoneNumber = 
    interpreter.phone_number || 
    interpreter.landline_phone || 
    interpreter.private_phone || 
    interpreter.professional_phone || 
    interpreter.booth_number;

  return (
    <Card className="hover-elevate gradient-border">
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status and Name */}
          <div className="flex items-center gap-2 min-w-0">
            <InterpreterStatusDropdown 
              interpreterId={interpreter.id}
              currentStatus={interpreterStatus}
              displayFormat="badge"
              onStatusChange={handleStatusChange}
            />
            <span className="font-medium truncate text-gradient-primary">{interpreter.name}</span>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2 justify-end">
            {/* Languages */}
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-palette-ocean-blue" />
              <div className="flex flex-wrap gap-1">
                {parsedLanguages.map((lang, index) => (
                  <div
                    key={index}
                    className="px-2 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded-lg text-xs flex items-center gap-1 shadow-sm"
                  >
                    <span>{lang.source}</span>
                    <span className="text-palette-vivid-purple">→</span>
                    <span>{lang.target}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Employment Status */}
            <div className="text-xs text-white font-medium bg-gradient-to-r from-palette-vivid-purple to-indigo-500 px-2 py-0.5 rounded-full shadow-sm">
              {employmentStatusLabels[interpreter.employment_status]}
            </div>

            {/* Work Location */}
            <div className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${workLocationConfig[workLocation].color}`}>
              <LocationIcon className="h-3 w-3" />
              <span>{workLocationLabels[workLocation]}</span>
            </div>

            {/* Next Mission */}
            {interpreter.next_mission_start && (
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
              />
            )}
            
            {/* Contact Information */}
            {hasAnyPhoneNumber && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {interpreter.booth_number && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Cabine:</span> {interpreter.booth_number}
                  </div>
                )}
                {interpreter.phone_number && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-palette-ocean-blue" />
                    <span>{interpreter.phone_number}</span>
                  </div>
                )}
                {interpreter.work_hours && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-palette-ocean-blue" />
                    <span>
                      {interpreter.work_hours.start_morning && interpreter.work_hours.end_morning && 
                        `${interpreter.work_hours.start_morning}-${interpreter.work_hours.end_morning}`}
                      {interpreter.work_hours.start_afternoon && interpreter.work_hours.end_afternoon && 
                        `, ${interpreter.work_hours.start_afternoon}-${interpreter.work_hours.end_afternoon}`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
