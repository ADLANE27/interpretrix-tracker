import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Phone, Clock, User, PhoneCall, RotateCw } from 'lucide-react';
import { Profile } from '@/types/profile';
import { WorkLocation } from '@/utils/workLocationStatus';
import { InterpreterStatusDropdown } from '../admin/interpreter/InterpreterStatusDropdown';
import { UpcomingMissionBadge } from '../UpcomingMissionBadge';
import { employmentStatusLabels } from '@/utils/employmentStatus';

interface CardFrontProps {
  interpreter: {
    id: string;
    name: string;
    employment_status: string;
    status: Profile['status'];
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
    tarif_5min: number | null;
    tarif_15min: number | null;
  };
  status: Profile['status'];
  isFlipped: boolean;
  handleStatusChange: (newStatus: Profile['status']) => void;
  hasAnyPhoneNumber: boolean;
  workLocation: WorkLocation;
  locationConfig: {
    [key in WorkLocation]: {
      color: string;
      icon: React.ElementType;
    };
  };
  showTarif5min: boolean;
  showTarif15min: boolean;
  hasFutureMission: boolean;
  flipCard: () => void;
}

export const CardFront: React.FC<CardFrontProps> = ({
  interpreter,
  status,
  isFlipped,
  handleStatusChange,
  hasAnyPhoneNumber,
  workLocation,
  locationConfig,
  showTarif5min,
  showTarif15min,
  hasFutureMission,
  flipCard
}) => {
  const badgeRef = useRef<HTMLDivElement>(null);
  const nameParts = interpreter.name.split(' ');
  const lastName = nameParts.shift() || '';
  const firstName = nameParts.join(' ');
  
  const LocationIcon = locationConfig[workLocation].icon;
  const showAnyTarif = showTarif5min || showTarif15min;
  
  useEffect(() => {
    if (badgeRef.current) {
      badgeRef.current.classList.add('pulse-animation');
      
      const timeout = setTimeout(() => {
        if (badgeRef.current) {
          badgeRef.current.classList.remove('pulse-animation');
        }
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [status]);

  return (
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
            <h3 className="text-lg font-bold text-gradient-primary leading-tight truncate">
              {lastName}
            </h3>
            {firstName && (
              <h3 className="text-lg font-bold text-gradient-primary leading-tight truncate">
                {firstName}
              </h3>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 mb-2 items-center">
          <div ref={badgeRef} className="transition-all">
            <InterpreterStatusDropdown 
              interpreterId={interpreter.id}
              currentStatus={status}
              displayFormat="badge"
              onStatusChange={handleStatusChange}
              className="text-[12px] px-2 py-1"
            />
          </div>
          
          <Badge variant="outline" className={`text-[12px] px-2 py-1 flex items-center gap-1 ${locationConfig[workLocation].color}`}>
            <LocationIcon className="h-3 w-3" />
            <span>{workLocation === "remote" ? "Télétravail" : "Sur site"}</span>
          </Badge>
          
          <Badge variant="outline" className="text-[12px] px-2 py-1 bg-gray-50">
            {employmentStatusLabels[interpreter.employment_status as any]}
          </Badge>
        </div>
        
        {showAnyTarif && (
          <div className="flex flex-wrap gap-1 mb-2">
            {showTarif5min && (
              <Badge variant="outline" className="text-[12px] bg-gray-50">
                5min: {interpreter.tarif_5min}€
              </Badge>
            )}
            
            {showTarif15min && (
              <Badge variant="outline" className="text-[12px] bg-gray-50">
                15min: {interpreter.tarif_15min}€
              </Badge>
            )}
          </div>
        )}

        {hasAnyPhoneNumber && (
          <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-sm text-foreground mb-2">
            {interpreter.booth_number && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4 text-palette-ocean-blue" />
                <span className="text-[12px]">Cabine {interpreter.booth_number}</span>
              </div>
            )}
            {interpreter.phone_number && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-palette-ocean-blue" />
                <span className="text-[12px]">{interpreter.phone_number}</span>
              </div>
            )}
            {interpreter.landline_phone && (
              <div className="flex items-center gap-1">
                <PhoneCall className="h-4 w-4 text-palette-ocean-blue" />
                <span className="text-[12px]">{interpreter.landline_phone}</span>
              </div>
            )}
            {interpreter.private_phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-palette-ocean-blue" />
                <span className="text-[12px]">{interpreter.private_phone}</span>
              </div>
            )}
            {interpreter.professional_phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-palette-ocean-blue" />
                <span className="text-[12px]">{interpreter.professional_phone}</span>
              </div>
            )}
            {interpreter.work_hours && (
              <div className="flex items-center gap-1 col-span-2">
                <Clock className="h-4 w-4 text-palette-ocean-blue" />
                <span className="text-[12px]">
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
  );
};
