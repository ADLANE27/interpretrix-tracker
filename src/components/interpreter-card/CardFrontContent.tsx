
import React from 'react';
import { Phone, Clock, User, PhoneCall, Home, Building, RotateCw } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { UpcomingMissionBadge } from '../UpcomingMissionBadge';
import { InterpreterStatusDropdown } from '../admin/interpreter/InterpreterStatusDropdown';
import { Profile } from '@/types/profile';
import { EmploymentStatus, employmentStatusLabels } from '@/utils/employmentStatus';
import { WorkLocation, workLocationLabels } from '@/utils/workLocationStatus';
import { ContactInfoItem } from './ContactInfoItem';

interface CardFrontContentProps {
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
  parsedLanguages: { source: string; target: string }[];
  hasAnyPhoneNumber: boolean;
  onStatusChange?: (interpreterId: string, newStatus: Profile['status']) => void;
  onFlipCard: () => void;
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

export const CardFrontContent: React.FC<CardFrontContentProps> = ({ 
  interpreter, 
  parsedLanguages, 
  hasAnyPhoneNumber, 
  onStatusChange, 
  onFlipCard 
}) => {
  const workLocation = interpreter.work_location || "on_site";
  const LocationIcon = workLocationConfig[workLocation].icon;

  const handleStatusChange = (newStatus: Profile['status']) => {
    if (onStatusChange) {
      onStatusChange(interpreter.id, newStatus);
    }
  };

  return (
    <>
      {/* Badges row */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          <InterpreterStatusDropdown 
            interpreterId={interpreter.id}
            currentStatus={interpreter.status}
            displayFormat="badge"
            onStatusChange={handleStatusChange}
            className="text-[11px] px-2 py-0.5"
          />
          
          <Badge variant="outline" className="text-[11px] bg-gray-50">
            {employmentStatusLabels[interpreter.employment_status]}
          </Badge>
          
          {interpreter.tarif_5min !== null && (
            <Badge variant="outline" className="text-[11px] bg-gray-50">
              5min: {interpreter.tarif_5min}€
            </Badge>
          )}
          
          {interpreter.tarif_15min !== null && (
            <Badge variant="outline" className="text-[11px] bg-gray-50">
              15min: {interpreter.tarif_15min}€
            </Badge>
          )}
        </div>
        <div className={`px-1.5 py-0.5 rounded-full text-[11px] flex items-center gap-0.5 ${workLocationConfig[workLocation].color}`}>
          <LocationIcon className="h-3 w-3" />
          <span className="hidden sm:inline">{workLocationLabels[workLocation]}</span>
        </div>
      </div>
      
      {/* Interpreter name */}
      <h3 className="text-sm font-medium text-gradient-primary truncate mb-1.5">{interpreter.name}</h3>
      
      {/* Language count summary and flip button */}
      <div className="mb-1.5 text-xs flex items-center justify-between">
        <span className="text-muted-foreground">
          {parsedLanguages.length} {parsedLanguages.length > 1 ? "langues" : "langue"}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 rounded-full" 
          onClick={onFlipCard}
        >
          <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      {/* Upcoming Mission */}
      {interpreter.next_mission_start && (
        <div className="mb-1.5">
          <UpcomingMissionBadge
            startTime={interpreter.next_mission_start}
            estimatedDuration={interpreter.next_mission_duration || 0}
            sourceLang={interpreter.next_mission_source_language}
            targetLang={interpreter.next_mission_target_language}
            useShortDateFormat={true}
          />
        </div>
      )}

      {/* Contact Information */}
      {hasAnyPhoneNumber && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-foreground">
          {interpreter.booth_number && (
            <ContactInfoItem 
              icon={User}
              text={`Cabine ${interpreter.booth_number}`}
            />
          )}
          {interpreter.phone_number && (
            <ContactInfoItem 
              icon={Phone}
              text={interpreter.phone_number}
            />
          )}
          {interpreter.landline_phone && (
            <ContactInfoItem 
              icon={PhoneCall}
              text={interpreter.landline_phone}
            />
          )}
          {interpreter.private_phone && (
            <ContactInfoItem 
              icon={Phone}
              text={interpreter.private_phone}
            />
          )}
          {interpreter.professional_phone && (
            <ContactInfoItem 
              icon={Phone}
              text={interpreter.professional_phone}
            />
          )}
          {interpreter.work_hours && (
            <ContactInfoItem 
              icon={Clock}
              text={`${interpreter.work_hours.start_morning && interpreter.work_hours.end_morning && 
                `${interpreter.work_hours.start_morning}-${interpreter.work_hours.end_morning}`}
                ${interpreter.work_hours.start_morning && interpreter.work_hours.end_morning && 
                interpreter.work_hours.start_afternoon && interpreter.work_hours.end_afternoon && 
                `, ${interpreter.work_hours.start_afternoon}-${interpreter.work_hours.end_afternoon}`}`}
              className="col-span-2"
            />
          )}
        </div>
      )}
    </>
  );
};
