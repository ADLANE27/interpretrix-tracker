
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Phone, Clock, User, PhoneCall, Home, Building, Calendar, Bell, MessageSquare } from 'lucide-react';
import { UpcomingMissionBadge } from './UpcomingMissionBadge';
import { EmploymentStatus, employmentStatusLabels } from '@/utils/employmentStatus';
import { Profile } from '@/types/profile';
import { WorkLocation, workLocationLabels } from '@/utils/workLocationStatus';
import { InterpreterStatusDropdown } from './admin/interpreter/InterpreterStatusDropdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { formatTimeString } from '@/utils/dateTimeUtils';

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
    last_seen_at?: string | null;
  };
  onStatusChange?: (interpreterId: string, newStatus: Profile['status']) => void;
}

const workLocationConfig = {
  remote: {
    color: 'bg-purple-100 text-purple-800 border border-purple-300',
    icon: Home
  },
  on_site: {
    color: 'bg-blue-100 text-blue-800 border border-blue-300',
    icon: Building
  }
};

const InterpreterCard: React.FC<InterpreterCardProps> = ({ interpreter, onStatusChange }) => {
  const [isContactExpanded, setIsContactExpanded] = useState(false);

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

  // Last seen status formatting
  const getLastSeenStatus = () => {
    if (!interpreter.last_seen_at) return null;
    
    const lastSeen = new Date(interpreter.last_seen_at);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / 60000);
    
    if (diffMinutes < 5) {
      return { text: "En ligne", variant: "default" as const };
    } else if (diffMinutes < 60) {
      return { text: `${diffMinutes}m`, variant: "secondary" as const };
    } else {
      const hours = Math.floor(diffMinutes / 60);
      if (hours < 24) {
        return { text: `${hours}h`, variant: "outline" as const };
      } else {
        const days = Math.floor(hours / 24);
        return { text: `${days}j`, variant: "outline" as const };
      }
    }
  };

  const lastSeenStatus = getLastSeenStatus();

  // Format work hours for display
  const formatWorkHours = () => {
    if (!interpreter.work_hours) return null;
    
    const { start_morning, end_morning, start_afternoon, end_afternoon } = interpreter.work_hours;
    
    if (!start_morning || !end_morning) return null;
    
    const morningHours = `${formatTimeString(start_morning)}-${formatTimeString(end_morning)}`;
    
    if (!start_afternoon || !end_afternoon) return morningHours;
    
    const afternoonHours = `${formatTimeString(start_afternoon)}-${formatTimeString(end_afternoon)}`;
    
    return `${morningHours}, ${afternoonHours}`;
  };

  const workHours = formatWorkHours();

  return (
    <Card className="hover-elevate gradient-border bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm overflow-hidden">
      <CardHeader className="card-header-gradient p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-gradient-primary text-lg font-bold">
              {interpreter.name}
            </CardTitle>
            {lastSeenStatus && (
              <Badge 
                variant={lastSeenStatus.variant} 
                className="text-[10px] h-5 px-1.5"
              >
                {lastSeenStatus.text}
              </Badge>
            )}
          </div>
          <InterpreterStatusDropdown 
            interpreterId={interpreter.id}
            currentStatus={interpreter.status}
            displayFormat="badge"
            onStatusChange={handleStatusChange}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">
            {employmentStatusLabels[interpreter.employment_status]}
          </p>
          <div className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${workLocationConfig[workLocation].color}`}>
            <LocationIcon className="h-3 w-3" />
            <span>{workLocationLabels[workLocation]}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-3 space-y-3">
        <div>
          <div className="flex flex-wrap gap-1.5 mb-0.5">
            {parsedLanguages.map((lang, index) => (
              <div
                key={index}
                className="px-2 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded-md text-xs flex items-center gap-1 shadow-sm"
              >
                <span>{lang.source}</span>
                <span className="text-palette-vivid-purple font-bold">→</span>
                <span>{lang.target}</span>
              </div>
            ))}
          </div>
        </div>

        {hasAnyPhoneNumber && (
          <Collapsible
            open={isContactExpanded}
            onOpenChange={setIsContactExpanded}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Contact
              </div>
              <CollapsibleTrigger asChild>
                <button className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                  {isContactExpanded ? 'Moins' : 'Plus'}
                </button>
              </CollapsibleTrigger>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              {interpreter.booth_number && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700">
                        <User className="h-3 w-3 text-palette-ocean-blue" />
                        <span>C{interpreter.booth_number}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cabine {interpreter.booth_number}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {interpreter.phone_number && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700">
                        <Phone className="h-3 w-3 text-palette-ocean-blue" />
                        <span>{interpreter.phone_number}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{interpreter.phone_number}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            <CollapsibleContent className="space-y-2 text-xs">
              {interpreter.landline_phone && (
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-3 w-3 text-palette-ocean-blue" />
                  <span>Fixe: {interpreter.landline_phone}</span>
                </div>
              )}
              
              {interpreter.private_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-palette-ocean-blue" />
                  <span>Tél. personnel: {interpreter.private_phone}</span>
                </div>
              )}
              
              {interpreter.professional_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-palette-ocean-blue" />
                  <span>Tél. professionnel: {interpreter.professional_phone}</span>
                </div>
              )}
              
              {workHours && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-palette-ocean-blue" />
                  <span>{workHours}</span>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>

      {(interpreter.next_mission_start || interpreter.tarif_15min || interpreter.tarif_5min) && (
        <CardFooter className="flex flex-col items-start p-4 pt-1 space-y-2">
          {interpreter.tarif_15min !== null || interpreter.tarif_5min !== null ? (
            <div className="w-full flex justify-between items-center">
              <div className="text-xs text-muted-foreground space-x-2">
                {interpreter.tarif_5min !== null && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded-md dark:bg-gray-700">5min: {interpreter.tarif_5min}€</span>
                )}
                {interpreter.tarif_15min !== null && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded-md dark:bg-gray-700">15min: {interpreter.tarif_15min}€</span>
                )}
              </div>
            </div>
          ) : null}
          
          {interpreter.next_mission_start && (
            <div className="w-full">
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
                sourceLang={interpreter.next_mission_source_language}
                targetLang={interpreter.next_mission_target_language}
              />
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
};

export default InterpreterCard;
