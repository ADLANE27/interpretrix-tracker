
import React from 'react';
import { Card, CardContent } from '../ui/card';
import { UpcomingMissionBadge } from '../UpcomingMissionBadge';
import { employmentStatusLabels, EmploymentStatus } from '@/utils/employmentStatus';
import { Profile } from '@/types/profile';
import { WorkLocation, workLocationLabels } from '@/utils/workLocationStatus';
import { Euro, Globe, RotateCw, Building, Home, PhoneCall } from 'lucide-react';
import { InterpreterStatusDropdown } from '@/components/admin/interpreter/InterpreterStatusDropdown';

interface CardFrontProps {
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
    work_location?: WorkLocation;
  };
  status: Profile['status'];
  isFlipped: boolean;
  handleStatusChange: (newStatus: Profile['status']) => void;
  hasAnyPhoneNumber: boolean;
  workLocation: WorkLocation;
  locationConfig: {
    remote: {
      color: string;
      icon: React.ComponentType<{ className?: string }>;
    };
    on_site: {
      color: string;
      icon: React.ComponentType<{ className?: string }>;
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
  const LocationIcon = locationConfig[workLocation].icon;
  
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
      className={`w-full h-full backface-hidden absolute top-0 left-0 border-2 border-palette-soft-purple/50 shadow-md ${!isFlipped ? 'visible' : 'invisible'}`}
    >
      <CardContent className="p-2 relative flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gradient-primary">{interpreter.name}</h3>
          <div className="flex items-center gap-1">
            <button 
              className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-primary rounded-full" 
              onClick={flipCard}
            >
              <RotateCw className="h-3 w-3" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 mb-1">
          <InterpreterStatusDropdown
            interpreterId={interpreter.id}
            currentStatus={status}
            displayFormat="badge"
            onStatusChange={handleStatusChange}
          />
          
          <div className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 ${locationConfig[workLocation].color}`}>
            <LocationIcon className="h-3 w-3" />
            <span>{workLocationLabels[workLocation]}</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-1 mb-1.5">
              <Globe className="h-3.5 w-3.5 text-palette-ocean-blue mt-0.5" />
              <div className="flex flex-wrap gap-1 text-xs">
                {interpreter.languages.map((lang, i) => {
                  const [source, target] = lang.split('→').map(l => l.trim());
                  return (
                    <div
                      key={i}
                      className="px-1.5 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded"
                    >
                      <span>{source}</span>
                      <span className="text-palette-vivid-purple">→</span>
                      <span>{target}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {(showTarif5min || showTarif15min) && (
              <div className="flex items-start gap-1 mb-1.5">
                <Euro className="h-3.5 w-3.5 text-palette-ocean-blue mt-0.5" />
                <div className="text-xs">
                  {showTarif5min && (
                    <span className="bg-slate-100 rounded px-1.5 py-0.5 mr-1">
                      5min: {interpreter.tarif_5min}€
                    </span>
                  )}
                  {showTarif15min && (
                    <span className="bg-slate-100 rounded px-1.5 py-0.5">
                      15min: {interpreter.tarif_15min}€
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {hasAnyPhoneNumber && (
              <div className="flex items-start gap-1 mb-1.5">
                <PhoneCall className="h-3.5 w-3.5 text-palette-ocean-blue mt-0.5" />
                <div className="text-xs truncate">
                  {interpreter.booth_number ? (
                    <span className="font-medium">
                      Cabine: {interpreter.booth_number}
                    </span>
                  ) : (
                    interpreter.phone_number
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-auto pt-1">
            <div className="text-xs bg-gradient-to-r from-palette-vivid-purple to-indigo-500 text-white px-1.5 py-0.5 rounded-full inline-block mb-1">
              {employmentStatusLabels[interpreter.employment_status]}
            </div>
            
            {hasFutureMission && (
              <div className="mt-1">
                <UpcomingMissionBadge
                  startTime={interpreter.next_mission_start || ''}
                  estimatedDuration={interpreter.next_mission_duration || 0}
                  sourceLang={interpreter.next_mission_source_language}
                  targetLang={interpreter.next_mission_target_language}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
