
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Home, Building, Phone, PhoneCall } from "lucide-react";
import { UpcomingMissionBadge } from "@/components/UpcomingMissionBadge";
import { EmploymentStatus, employmentStatusLabels } from "@/utils/employmentStatus";
import { Profile } from "@/types/profile";
import { WorkLocation, workLocationLabels } from "@/utils/workLocationStatus";
import { InterpreterStatusDropdown } from "./InterpreterStatusDropdown";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatTimeString } from "@/utils/dateTimeUtils";

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
    landline_phone?: string | null;
    professional_phone?: string | null;
    private_phone?: string | null;
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

  // Format work hours if available
  const formatWorkHours = () => {
    if (!interpreter.work_hours) return null;
    
    const { start_morning, end_morning, start_afternoon, end_afternoon } = interpreter.work_hours;
    
    const morningHours = start_morning && end_morning 
      ? `${formatTimeString(start_morning)}-${formatTimeString(end_morning)}`
      : "";
      
    const afternoonHours = start_afternoon && end_afternoon 
      ? `${formatTimeString(start_afternoon)}-${formatTimeString(end_afternoon)}`
      : "";
      
    if (morningHours && afternoonHours) {
      return `${morningHours}, ${afternoonHours}`;
    } else if (morningHours) {
      return morningHours;
    } else if (afternoonHours) {
      return afternoonHours;
    }
    
    return null;
  };

  const workHours = formatWorkHours();

  // Check if any contact info is available
  const hasContactInfo = interpreter.phone_number || 
                         interpreter.landline_phone || 
                         interpreter.professional_phone || 
                         interpreter.private_phone || 
                         workHours;

  return (
    <Card className="p-4 hover-elevate gradient-border">
      <CardContent className="p-0">
        <div className="flex flex-col gap-2">
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

            <div className="flex items-center gap-3 flex-wrap justify-end">
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
            </div>
          </div>
          
          {/* Contact Info Section */}
          {hasContactInfo && (
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600">
              {interpreter.phone_number && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-palette-ocean-blue" />
                  <span>{interpreter.phone_number}</span>
                </div>
              )}
              
              {interpreter.landline_phone && (
                <div className="flex items-center gap-1.5">
                  <PhoneCall className="h-3.5 w-3.5 text-palette-ocean-blue" />
                  <span>{interpreter.landline_phone}</span>
                </div>
              )}
              
              {interpreter.professional_phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-palette-ocean-blue" />
                  <span>Pro: {interpreter.professional_phone}</span>
                </div>
              )}
              
              {interpreter.private_phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-palette-ocean-blue" />
                  <span>Perso: {interpreter.private_phone}</span>
                </div>
              )}
              
              {workHours && (
                <div className="bg-gray-100 px-2 py-1 rounded text-xs">
                  Horaires: {workHours}
                </div>
              )}
            </div>
          )}

          {/* Upcoming Mission Section */}
          {interpreter.next_mission_start && (
            <div className="mt-1">
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
