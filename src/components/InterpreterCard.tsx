
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Phone, Clock, User, PhoneCall, Home, Building, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { UpcomingMissionBadge } from './UpcomingMissionBadge';
import { EmploymentStatus, employmentStatusLabels } from '@/utils/employmentStatus';
import { Profile } from '@/types/profile';
import { WorkLocation, workLocationLabels } from '@/utils/workLocationStatus';
import { InterpreterStatusDropdown } from './admin/interpreter/InterpreterStatusDropdown';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

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
    icon: Home
  },
  on_site: {
    color: 'bg-blue-100 text-blue-800 border border-blue-300',
    icon: Building
  }
};

const InterpreterCard: React.FC<InterpreterCardProps> = ({ interpreter, onStatusChange }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  // Display the primary contact
  const getPrimaryContact = () => {
    if (interpreter.booth_number) {
      return { icon: User, label: `Cabine ${interpreter.booth_number}` };
    }
    if (interpreter.phone_number) {
      return { icon: Phone, label: interpreter.phone_number };
    }
    if (interpreter.professional_phone) {
      return { icon: Phone, label: interpreter.professional_phone };
    }
    if (interpreter.private_phone) {
      return { icon: Phone, label: interpreter.private_phone };
    }
    if (interpreter.landline_phone) {
      return { icon: PhoneCall, label: interpreter.landline_phone };
    }
    return null;
  };

  const primaryContact = getPrimaryContact();

  return (
    <Card className="hover-elevate gradient-border">
      <CardHeader className="pb-1 pt-3 px-4 card-header-gradient">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-grow min-w-0"> {/* This ensures the name div shrinks properly */}
            <CardTitle className="text-gradient-primary text-lg truncate">{interpreter.name}</CardTitle>
            <div className="flex items-center gap-1 flex-wrap text-xs">
              <span className="text-muted-foreground">
                {employmentStatusLabels[interpreter.employment_status]}
              </span>
              <div className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-0.5 ${workLocationConfig[workLocation].color}`}>
                <LocationIcon className="h-2.5 w-2.5" />
                <span>{workLocationLabels[workLocation]}</span>
              </div>
            </div>
          </div>
          <InterpreterStatusDropdown 
            interpreterId={interpreter.id}
            currentStatus={interpreter.status}
            displayFormat="badge"
            onStatusChange={handleStatusChange}
            className="text-xs min-w-[80px] flex-shrink-0"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-1.5 px-4">
        <div className="space-y-2">
          {/* Contact information - Always visible */}
          {primaryContact && (
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <primaryContact.icon className="h-3 w-3 text-palette-ocean-blue flex-shrink-0" />
              <span className="truncate">{primaryContact.label}</span>
            </div>
          )}

          {/* Languages - Compact display with tooltip for full list */}
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3 text-palette-ocean-blue flex-shrink-0" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-wrap gap-1">
                    {parsedLanguages.length > 3 ? (
                      <>
                        {parsedLanguages.slice(0, 2).map((lang, index) => (
                          <span
                            key={index}
                            className="px-1.5 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded text-xs"
                          >
                            {lang.source}<span className="text-palette-vivid-purple">→</span>{lang.target}
                          </span>
                        ))}
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          +{parsedLanguages.length - 2}
                        </span>
                      </>
                    ) : (
                      parsedLanguages.map((lang, index) => (
                        <span
                          key={index}
                          className="px-1.5 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded text-xs"
                        >
                          {lang.source}<span className="text-palette-vivid-purple">→</span>{lang.target}
                        </span>
                      ))
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1 p-1">
                    {parsedLanguages.map((lang, index) => (
                      <div key={index} className="text-xs">
                        {lang.source} → {lang.target}
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Work Hours - Compact display */}
          {interpreter.work_hours && (
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Clock className="h-3 w-3 text-palette-ocean-blue flex-shrink-0" />
              <span className="truncate">
                {interpreter.work_hours.start_morning} - {interpreter.work_hours.end_morning}, {' '}
                {interpreter.work_hours.start_afternoon} - {interpreter.work_hours.end_afternoon}
              </span>
            </div>
          )}
        </div>

        {/* Upcoming Mission Badge */}
        {interpreter.next_mission_start && (
          <div className="mt-2">
            <UpcomingMissionBadge
              startTime={interpreter.next_mission_start}
              estimatedDuration={interpreter.next_mission_duration || 0}
              sourceLang={interpreter.next_mission_source_language}
              targetLang={interpreter.next_mission_target_language}
            />
          </div>
        )}

        {/* Additional Contact Details section - Collapsible */}
        {hasAnyPhoneNumber && (
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="w-full mt-1.5">
            <CollapsibleTrigger className="flex items-center justify-center w-full text-[10px] text-muted-foreground hover:text-primary py-0.5 transition-colors">
              {detailsOpen ? (
                <>
                  <span>Moins de détails</span>
                  <ChevronUp className="h-2.5 w-2.5 ml-1" />
                </>
              ) : (
                <>
                  <span>Plus de détails</span>
                  <ChevronDown className="h-2.5 w-2.5 ml-1" />
                </>
              )}
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-1.5 text-xs">
              <div className="space-y-1">
                {interpreter.booth_number && primaryContact?.label !== `Cabine ${interpreter.booth_number}` && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-palette-ocean-blue" />
                    <span>Cabine {interpreter.booth_number}</span>
                  </div>
                )}
                
                {interpreter.phone_number && primaryContact?.label !== interpreter.phone_number && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-palette-ocean-blue" />
                    <span>Mobile: {interpreter.phone_number}</span>
                  </div>
                )}
                
                {interpreter.landline_phone && primaryContact?.label !== interpreter.landline_phone && (
                  <div className="flex items-center gap-1">
                    <PhoneCall className="h-3 w-3 text-palette-ocean-blue" />
                    <span>Fixe: {interpreter.landline_phone}</span>
                  </div>
                )}
                
                {interpreter.private_phone && primaryContact?.label !== interpreter.private_phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-palette-ocean-blue" />
                    <span>Tél. personnel: {interpreter.private_phone}</span>
                  </div>
                )}
                
                {interpreter.professional_phone && primaryContact?.label !== interpreter.professional_phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-palette-ocean-blue" />
                    <span>Tél. professionnel: {interpreter.professional_phone}</span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>

      {(interpreter.tarif_15min !== null || interpreter.tarif_5min !== null) && (
        <CardFooter className="flex pt-0 pb-2 px-4 text-[10px] text-muted-foreground">
          {interpreter.tarif_5min !== null && `Tarif 5min: ${interpreter.tarif_5min}€`}
          {interpreter.tarif_5min !== null && interpreter.tarif_15min !== null && ' | '}
          {interpreter.tarif_15min !== null && `Tarif 15min: ${interpreter.tarif_15min}€`}
        </CardFooter>
      )}
    </Card>
  );
};

export default InterpreterCard;
