
import React from 'react';
import { Card, CardContent } from './ui/card';
import { Phone, Clock, User, PhoneCall, Home, Building, Languages, Briefcase, MapPin } from 'lucide-react';
import { UpcomingMissionBadge } from './UpcomingMissionBadge';
import { EmploymentStatus, employmentStatusLabels } from '@/utils/employmentStatus';
import { Profile } from '@/types/profile';
import { WorkLocation, workLocationLabels } from '@/utils/workLocationStatus';
import { InterpreterStatusDropdown } from './admin/interpreter/InterpreterStatusDropdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';

interface InterpreterCardProps {
  interpreter: {
    id: string;
    name: string;
    status: Profile['status'];
    employment_status: EmploymentStatus;
    languages: string[];
    tarif_15min: number | null;
    tarif_5min: number | null;
    phone_number: string | null;
    next_mission_start: string | null;
    next_mission_duration: number | null;
    next_mission_source_language?: string | null;
    next_mission_target_language?: string | null;
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
    work_location?: WorkLocation;
  };
  onStatusChange?: (interpreterId: string, newStatus: Profile['status']) => void;
}

const workLocationConfig = {
  remote: {
    color: 'bg-purple-100 text-purple-800 border border-purple-300',
    hoverColor: 'hover:bg-purple-200',
    icon: Home
  },
  on_site: {
    color: 'bg-blue-100 text-blue-800 border border-blue-300',
    hoverColor: 'hover:bg-blue-200',
    icon: Building
  }
};

const InterpreterCard: React.FC<InterpreterCardProps> = ({ interpreter, onStatusChange }) => {
  const parsedLanguages = interpreter.languages
    .map(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return { source, target };
    })
    .filter(lang => lang.source && lang.target);

  const hasAnyPhoneNumber = 
    interpreter.phone_number || 
    interpreter.landline_phone || 
    interpreter.private_phone || 
    interpreter.professional_phone || 
    interpreter.booth_number;

  const workLocation = interpreter.work_location || "on_site";
  const LocationIcon = workLocationConfig[workLocation].icon;

  const handleStatusChange = (newStatus: Profile['status']) => {
    if (onStatusChange) {
      onStatusChange(interpreter.id, newStatus);
    }
  };

  return (
    <Card className="hover-elevate gradient-border transition-all duration-300 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header Section with Name, Status and Work Location */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <InterpreterStatusDropdown 
                interpreterId={interpreter.id}
                currentStatus={interpreter.status}
                displayFormat="badge"
                onStatusChange={handleStatusChange}
                className="text-[10px] px-1.5 py-0.5 h-5"
              />
              <h3 className="text-sm font-medium text-gradient-primary truncate">{interpreter.name}</h3>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 cursor-default transition-colors",
                    workLocationConfig[workLocation].color,
                    workLocationConfig[workLocation].hoverColor
                  )}>
                    <LocationIcon className="h-2.5 w-2.5" />
                    <span className="hidden sm:inline">{workLocationLabels[workLocation]}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {workLocationLabels[workLocation]}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Languages Section */}
          <div className="flex items-center gap-1.5">
            <Languages className="h-3 w-3 text-palette-ocean-blue" />
            <div className="flex flex-wrap gap-1">
              {parsedLanguages.map((lang, index) => (
                <div
                  key={index}
                  className="px-1.5 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded text-[10px] flex items-center gap-0.5 shadow-sm"
                >
                  <span>{lang.source}</span>
                  <span className="text-palette-vivid-purple">→</span>
                  <span>{lang.target}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Mission Section - Highlighted */}
          {interpreter.next_mission_start && (
            <div className="flex items-center">
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
                sourceLang={interpreter.next_mission_source_language}
                targetLang={interpreter.next_mission_target_language}
                compact={true}
                className="h-5 text-[10px]"
              />
            </div>
          )}

          {/* Contact Information Section */}
          {hasAnyPhoneNumber && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
              {interpreter.booth_number && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5 text-palette-ocean-blue" />
                  <span>Cabine {interpreter.booth_number}</span>
                </div>
              )}
              {interpreter.phone_number && (
                <div className="flex items-center gap-1">
                  <Phone className="h-2.5 w-2.5 text-palette-ocean-blue" />
                  <span className="truncate">{interpreter.phone_number}</span>
                </div>
              )}
              {interpreter.landline_phone && (
                <div className="flex items-center gap-1">
                  <PhoneCall className="h-2.5 w-2.5 text-palette-ocean-blue" />
                  <span className="truncate">{interpreter.landline_phone}</span>
                </div>
              )}
              {interpreter.private_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-2.5 w-2.5 text-palette-ocean-blue" />
                  <span className="truncate">{interpreter.private_phone}</span>
                </div>
              )}
              {interpreter.professional_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-2.5 w-2.5 text-palette-ocean-blue" />
                  <span className="truncate">{interpreter.professional_phone}</span>
                </div>
              )}
              {interpreter.work_hours && (
                <div className="flex items-center gap-1 col-span-2">
                  <Clock className="h-2.5 w-2.5 text-palette-ocean-blue" />
                  <span className="truncate">
                    {interpreter.work_hours.start_morning && interpreter.work_hours.end_morning && 
                      `${interpreter.work_hours.start_morning}-${interpreter.work_hours.end_morning}`}
                    {interpreter.work_hours.start_morning && interpreter.work_hours.end_morning && 
                      interpreter.work_hours.start_afternoon && interpreter.work_hours.end_afternoon && 
                      `, ${interpreter.work_hours.start_afternoon}-${interpreter.work_hours.end_afternoon}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Footer Section with Employment Status and Rates */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1">
              <Briefcase className="h-2.5 w-2.5 text-palette-ocean-blue" />
              <span>{employmentStatusLabels[interpreter.employment_status]}</span>
            </div>
            {(interpreter.tarif_15min !== null || interpreter.tarif_5min !== null) && (
              <span className="font-medium">
                {interpreter.tarif_5min !== null && `5min: ${interpreter.tarif_5min}€`}
                {interpreter.tarif_5min !== null && interpreter.tarif_15min !== null && ' | '}
                {interpreter.tarif_15min !== null && `15min: ${interpreter.tarif_15min}€`}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InterpreterCard;
