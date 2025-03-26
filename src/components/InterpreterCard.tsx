
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Phone, Clock, User, PhoneCall, Home, Building, ChevronDown, ChevronUp } from 'lucide-react';
import { UpcomingMissionBadge } from './UpcomingMissionBadge';
import { EmploymentStatus, employmentStatusLabels } from '@/utils/employmentStatus';
import { Profile } from '@/types/profile';
import { WorkLocation, workLocationLabels } from '@/utils/workLocationStatus';
import { InterpreterStatusDropdown } from './admin/interpreter/InterpreterStatusDropdown';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

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

  return (
    <Card className="hover-elevate gradient-border">
      <CardHeader className="pb-2 card-header-gradient">
        <div className="flex flex-row justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-gradient-primary">{interpreter.name}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {employmentStatusLabels[interpreter.employment_status]}
              </span>
              <div className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${workLocationConfig[workLocation].color}`}>
                <LocationIcon className="h-3 w-3" />
                <span>{workLocationLabels[workLocation]}</span>
              </div>
            </div>
          </div>
          <InterpreterStatusDropdown 
            interpreterId={interpreter.id}
            currentStatus={interpreter.status}
            displayFormat="badge"
            onStatusChange={handleStatusChange}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-3 pb-2 space-y-3">
        <div>
          <div className="flex flex-wrap gap-1.5">
            {parsedLanguages.map((lang, index) => (
              <div
                key={index}
                className="px-2 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded-md text-xs flex items-center gap-1 shadow-sm"
              >
                <span>{lang.source}</span>
                <span className="text-palette-vivid-purple">→</span>
                <span>{lang.target}</span>
              </div>
            ))}
          </div>
        </div>

        {interpreter.next_mission_start && (
          <UpcomingMissionBadge
            startTime={interpreter.next_mission_start}
            estimatedDuration={interpreter.next_mission_duration || 0}
            sourceLang={interpreter.next_mission_source_language}
            targetLang={interpreter.next_mission_target_language}
          />
        )}

        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="w-full">
          <CollapsibleTrigger className="flex items-center justify-center w-full text-xs text-muted-foreground hover:text-primary py-1 transition-colors">
            {detailsOpen ? (
              <>
                <span>Moins de détails</span>
                <ChevronUp className="h-3 w-3 ml-1" />
              </>
            ) : (
              <>
                <span>Plus de détails</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </>
            )}
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pt-2 space-y-3">
            {hasAnyPhoneNumber && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium uppercase text-muted-foreground">CONTACT</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                  {interpreter.booth_number && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-palette-ocean-blue" />
                      <span>Cabine {interpreter.booth_number}</span>
                    </div>
                  )}
                  
                  {interpreter.phone_number && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-palette-ocean-blue" />
                      <span>Mobile: {interpreter.phone_number}</span>
                    </div>
                  )}
                  
                  {interpreter.landline_phone && (
                    <div className="flex items-center gap-1">
                      <PhoneCall className="h-3 w-3 text-palette-ocean-blue" />
                      <span>Fixe: {interpreter.landline_phone}</span>
                    </div>
                  )}
                  
                  {interpreter.private_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-palette-ocean-blue" />
                      <span>Tél. personnel: {interpreter.private_phone}</span>
                    </div>
                  )}
                  
                  {interpreter.professional_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-palette-ocean-blue" />
                      <span>Tél. professionnel: {interpreter.professional_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {interpreter.work_hours && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium uppercase text-muted-foreground">HORAIRES</h4>
                <div className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3 text-palette-ocean-blue" />
                  <span>
                    {interpreter.work_hours.start_morning} - {interpreter.work_hours.end_morning}, {' '}
                    {interpreter.work_hours.start_afternoon} - {interpreter.work_hours.end_afternoon}
                  </span>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {(interpreter.tarif_15min !== null || interpreter.tarif_5min !== null) && (
        <CardFooter className="flex pt-2 pb-3 text-xs text-muted-foreground">
          {interpreter.tarif_5min !== null && `Tarif 5min: ${interpreter.tarif_5min}€`}
          {interpreter.tarif_5min !== null && interpreter.tarif_15min !== null && ' | '}
          {interpreter.tarif_15min !== null && `Tarif 15min: ${interpreter.tarif_15min}€`}
        </CardFooter>
      )}
    </Card>
  );
};

export default InterpreterCard;
