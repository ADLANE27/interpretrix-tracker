
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Phone, Clock, User, PhoneCall, Home, Building, RotateCw } from 'lucide-react';
import { UpcomingMissionBadge } from './UpcomingMissionBadge';
import { EmploymentStatus, employmentStatusLabels } from '@/utils/employmentStatus';
import { Profile } from '@/types/profile';
import { WorkLocation, workLocationLabels } from '@/utils/workLocationStatus';
import { InterpreterStatusDropdown } from './admin/interpreter/InterpreterStatusDropdown';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { format, parseISO, isPast, addMinutes } from 'date-fns';
import { useInterpreterStatusSync } from '@/hooks/useInterpreterStatusSync';

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
  const [status, setStatus] = useState(interpreter.status);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const flipCard = () => {
    setIsFlipped(prev => !prev);
  };
  
  const { updateStatus } = useInterpreterStatusSync({
    interpreterId: interpreter.id,
    onStatusChange: (newStatus) => {
      console.log(`[InterpreterCard] Status sync updated status to: ${newStatus}`);
      setStatus(newStatus);
      
      if (onStatusChange && newStatus !== interpreter.status) {
        onStatusChange(interpreter.id, newStatus);
      }
    },
    initialStatus: interpreter.status,
    isAdmin: true
  });
  
  useEffect(() => {
    if (interpreter.status !== status) {
      console.log(`[InterpreterCard] Status updated from prop for ${interpreter.name}:`, interpreter.status);
      setStatus(interpreter.status);
    }
  }, [interpreter.status, status]);

  const handleStatusChange = async (newStatus: Profile['status']) => {
    console.log(`[InterpreterCard] Status change requested for ${interpreter.name} to ${newStatus}`);
    setStatus(newStatus);
    
    if (onStatusChange) {
      onStatusChange(interpreter.id, newStatus);
    }
  };

  const nameParts = interpreter.name.split(' ');
  const lastName = nameParts.shift() || '';
  const firstName = nameParts.join(' ');

  const parsedLanguages = interpreter.languages
    .map(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return { source, target };
    })
    .filter(lang => lang.source && lang.target);

  const hasAnyPhoneNumber = Boolean(
    interpreter.phone_number || 
    interpreter.landline_phone || 
    interpreter.private_phone || 
    interpreter.professional_phone || 
    interpreter.booth_number
  );

  const workLocation = interpreter.work_location || "on_site";
  const LocationIcon = workLocationConfig[workLocation].icon;

  const showTarif5min = interpreter.tarif_5min !== null && interpreter.tarif_5min > 0;
  const showTarif15min = interpreter.tarif_15min !== null && interpreter.tarif_15min > 0;
  const showAnyTarif = showTarif5min || showTarif15min;

  console.log(`[InterpreterCard] ${interpreter.name} tarifs:`, {
    tarif_5min: interpreter.tarif_5min,
    tarif_15min: interpreter.tarif_15min,
    showTarif5min,
    showTarif15min,
    showAnyTarif
  });

  const hasFutureMission = interpreter.next_mission_start && 
    !isPast(addMinutes(
      parseISO(interpreter.next_mission_start), 
      interpreter.next_mission_duration || 0
    ));

  return (
    <div className="preserve-3d perspective-1000 w-full h-full relative">
      <Card
        asMotion
        motionProps={{
          animate: { 
            rotateY: isFlipped ? 180 : 0 
          },
          transition: { 
            duration: 0.6, 
            type: "spring", 
            stiffness: 260, 
            damping: 20 
          }
        }}
        className={`hover-elevate gradient-border w-full h-full backface-hidden border-2 border-palette-soft-purple/50 shadow-md ${isFlipped ? 'invisible' : 'visible'}`}
      >
        <CardContent className="p-2 relative flex flex-col h-full justify-between">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-base font-bold text-gradient-primary leading-tight truncate">
                {lastName}
              </h3>
              {firstName && (
                <h3 className="text-base font-bold text-gradient-primary leading-tight truncate">
                  {firstName}
                </h3>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1 mb-2 items-center">
            <InterpreterStatusDropdown 
              interpreterId={interpreter.id}
              currentStatus={interpreter.status}
              displayFormat="badge"
              onStatusChange={handleStatusChange}
              className="text-[10px] px-1.5 py-0.5"
            />
            
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 flex items-center gap-0.5 ${workLocationConfig[workLocation].color}`}>
              <LocationIcon className="h-2.5 w-2.5" />
              <span>{workLocationLabels[workLocation]}</span>
            </Badge>
            
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-gray-50">
              {employmentStatusLabels[interpreter.employment_status]}
            </Badge>
          </div>
          
          {showAnyTarif && (
            <div className="flex flex-wrap gap-1 mb-2">
              {showTarif5min && (
                <Badge variant="outline" className="text-[10px] bg-gray-50">
                  5min: {interpreter.tarif_5min}€
                </Badge>
              )}
              
              {showTarif15min && (
                <Badge variant="outline" className="text-[10px] bg-gray-50">
                  15min: {interpreter.tarif_15min}€
                </Badge>
              )}
            </div>
          )}

          {hasAnyPhoneNumber && (
            <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-xs text-foreground mb-2">
              {interpreter.booth_number && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-palette-ocean-blue" />
                  <span className="text-[11px]">Cabine {interpreter.booth_number}</span>
                </div>
              )}
              {interpreter.phone_number && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-palette-ocean-blue" />
                  <span className="text-[11px]">{interpreter.phone_number}</span>
                </div>
              )}
              {interpreter.landline_phone && (
                <div className="flex items-center gap-1">
                  <PhoneCall className="h-3 w-3 text-palette-ocean-blue" />
                  <span className="text-[11px]">{interpreter.landline_phone}</span>
                </div>
              )}
              {interpreter.private_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-palette-ocean-blue" />
                  <span className="text-[11px]">{interpreter.private_phone}</span>
                </div>
              )}
              {interpreter.professional_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-palette-ocean-blue" />
                  <span className="text-[11px]">{interpreter.professional_phone}</span>
                </div>
              )}
              {interpreter.work_hours && (
                <div className="flex items-center gap-1 col-span-2">
                  <Clock className="h-3 w-3 text-palette-ocean-blue" />
                  <span className="text-[11px]">
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

          {hasFutureMission && interpreter.next_mission_start && (
            <div className="mb-1">
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
                sourceLang={interpreter.next_mission_source_language}
                targetLang={interpreter.next_mission_target_language}
                useShortDateFormat={true}
                className="bg-red-500 text-white"
              />
            </div>
          )}

          <div className="flex items-center justify-end text-xs mt-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 rounded-full" 
              onClick={flipCard}
            >
              <RotateCw className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card
        asMotion
        motionProps={{
          animate: { 
            rotateY: isFlipped ? 0 : -180 
          },
          transition: { 
            duration: 0.6, 
            type: "spring", 
            stiffness: 260, 
            damping: 20 
          }
        }}
        className={`hover-elevate gradient-border w-full h-full backface-hidden absolute top-0 left-0 border-2 border-palette-soft-purple/50 shadow-md ${isFlipped ? 'visible' : 'invisible'}`}
      >
        <CardContent className="p-2 relative flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-gradient-primary leading-tight">{lastName}</h3>
              {firstName && <span className="text-xs text-muted-foreground block">{firstName}</span>}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 rounded-full" 
              onClick={flipCard}
            >
              <RotateCw className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
          
          <div className="mb-1 text-xs font-medium text-muted-foreground">Combinaisons de langues:</div>
          <div className="flex flex-wrap gap-1 max-h-[calc(100%-60px)] overflow-y-auto pr-1 hide-scrollbar">
            {parsedLanguages.map((lang, index) => (
              <div
                key={index}
                className="px-1.5 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded text-[11px] flex items-center gap-0.5"
              >
                <span>{lang.source}</span>
                <span className="text-palette-vivid-purple">→</span>
                <span>{lang.target}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterpreterCard;
