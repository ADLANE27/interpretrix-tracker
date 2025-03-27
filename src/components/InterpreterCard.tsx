
import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, MapPin, Phone, Calendar, Clock } from 'lucide-react';
import { UpcomingMissionBadge } from '@/components/UpcomingMissionBadge';
import { Profile } from '@/types/profile';
import { WorkLocation, workLocationLabels } from '@/utils/workLocationStatus';
import { EmploymentStatus, employmentStatusLabels } from '@/utils/employmentStatus';
import { formatPhoneNumber } from '@/utils/formatters';
import { InterpreterStatusDropdown } from '@/components/admin/interpreter/InterpreterStatusDropdown';

interface InterpreterCardProps {
  interpreter: {
    id: string;
    name: string;
    status: Profile['status'];
    employment_status: EmploymentStatus;
    languages: string[];
    tarif_15min?: number | null;
    tarif_5min?: number | null;
    phone_number?: string | null;
    next_mission_start?: string | null;
    next_mission_duration?: number | null;
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

const InterpreterCard: React.FC<InterpreterCardProps> = ({ interpreter, onStatusChange }) => {
  // Set up event listener to help force refresh when needed
  useEffect(() => {
    const handleForceRefresh = (event: CustomEvent) => {
      if (event.detail && event.detail.interpreterId === interpreter.id) {
        console.log(`[InterpreterCard] Force refresh triggered for interpreter ${interpreter.id}`);
      }
    };
    
    window.addEventListener('interpreter-force-refresh' as any, handleForceRefresh);
    
    return () => {
      window.removeEventListener('interpreter-force-refresh' as any, handleForceRefresh);
    };
  }, [interpreter.id]);

  const handleStatusChange = (newStatus: Profile['status']) => {
    console.log(`[InterpreterCard] Status change requested for ${interpreter.id}:`, newStatus);
    if (onStatusChange) {
      onStatusChange(interpreter.id, newStatus);
    }
  };

  return (
    <Card className="h-full hover:shadow-md transition-shadow duration-300">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          {/* Header with name and status */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{interpreter.name}</h3>
            
            <InterpreterStatusDropdown
              interpreterId={interpreter.id}
              currentStatus={interpreter.status}
              onStatusChange={handleStatusChange}
            />
          </div>
          
          {/* Employment type */}
          <div className="text-sm text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 px-2 py-1 rounded-md inline-block">
            {employmentStatusLabels[interpreter.employment_status]}
          </div>
          
          {/* Languages */}
          <div className="flex items-start gap-2">
            <Globe className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
            <div className="flex flex-wrap gap-1">
              {interpreter.languages.map((lang, index) => {
                const [source, target] = lang.split('→').map(l => l.trim());
                return (
                  <div 
                    key={index} 
                    className="bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs px-2 py-0.5 rounded">
                    {source} → {target}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Work location */}
          {interpreter.work_location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>{workLocationLabels[interpreter.work_location]}</span>
            </div>
          )}
          
          {/* Phone number */}
          {interpreter.phone_number && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-500" />
              <span>{formatPhoneNumber(interpreter.phone_number)}</span>
            </div>
          )}
          
          {/* Work hours if available */}
          {interpreter.work_hours && (interpreter.work_hours.start_morning || interpreter.work_hours.start_afternoon) && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>
                {interpreter.work_hours.start_morning && interpreter.work_hours.end_morning && 
                  `${interpreter.work_hours.start_morning}-${interpreter.work_hours.end_morning}`}
                {interpreter.work_hours.start_morning && interpreter.work_hours.end_morning && 
                  interpreter.work_hours.start_afternoon && interpreter.work_hours.end_afternoon && 
                  ' | '}
                {interpreter.work_hours.start_afternoon && interpreter.work_hours.end_afternoon &&
                  `${interpreter.work_hours.start_afternoon}-${interpreter.work_hours.end_afternoon}`}
              </span>
            </div>
          )}
          
          {/* Next mission */}
          {interpreter.next_mission_start && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1 text-sm font-medium">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Prochaine mission</span>
              </div>
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
                className="ml-6"
              />
              {interpreter.next_mission_source_language && interpreter.next_mission_target_language && (
                <div className="ml-6 mt-1 bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs px-2 py-0.5 rounded inline-block">
                  {interpreter.next_mission_source_language} → {interpreter.next_mission_target_language}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InterpreterCard;
