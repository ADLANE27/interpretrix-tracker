import React from 'react';
import { Card, CardContent } from './ui/card';
import { Phone, Clock, User, PhoneCall, Home, Building } from 'lucide-react';
import { UpcomingMissionBadge } from './UpcomingMissionBadge';
import { EmploymentStatus, employmentStatusLabels } from '@/utils/employmentStatus';
import { Profile } from '@/types/profile';
import { WorkLocation, workLocationLabels } from '@/utils/workLocationStatus';
import { InterpreterStatusDropdown } from './admin/interpreter/InterpreterStatusDropdown';

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
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <InterpreterStatusDropdown 
                interpreterId={interpreter.id}
                currentStatus={interpreter.status}
                displayFormat="badge"
                onStatusChange={handleStatusChange}
              />
              <h3 className="text-sm font-medium text-gradient-primary truncate">{interpreter.name}</h3>
            </div>
            <div className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${workLocationConfig[workLocation].color}`}>
              <LocationIcon className="h-3 w-3" />
              <span className="hidden sm:inline">{workLocationLabels[workLocation]}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {parsedLanguages.map((lang, index) => (
              <div
                key={index}
                className="px-2 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded text-xs flex items-center gap-1"
              >
                <span>{lang.source}</span>
                <span className="text-palette-vivid-purple">→</span>
                <span>{lang.target}</span>
              </div>
            ))}
          </div>

          {interpreter.next_mission_start && (
            <div className="py-1">
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
                sourceLang={interpreter.next_mission_source_language}
                targetLang={interpreter.next_mission_target_language}
              />
            </div>
          )}

          {hasAnyPhoneNumber && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {interpreter.booth_number && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-palette-ocean-blue" />
                  <span>Cabine {interpreter.booth_number}</span>
                </div>
              )}
              {interpreter.phone_number && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-palette-ocean-blue" />
                  <span>{interpreter.phone_number}</span>
                </div>
              )}
              {interpreter.landline_phone && (
                <div className="flex items-center gap-1">
                  <PhoneCall className="h-3 w-3 text-palette-ocean-blue" />
                  <span>{interpreter.landline_phone}</span>
                </div>
              )}
              {interpreter.private_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-palette-ocean-blue" />
                  <span>{interpreter.private_phone}</span>
                </div>
              )}
              {interpreter.professional_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-palette-ocean-blue" />
                  <span>{interpreter.professional_phone}</span>
                </div>
              )}
              {interpreter.work_hours && (
                <div className="flex items-center gap-1 col-span-2">
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

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
            <span>{employmentStatusLabels[interpreter.employment_status]}</span>
            {(interpreter.tarif_15min !== null || interpreter.tarif_5min !== null) && (
              <span>
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
