
import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Globe, Phone } from 'lucide-react';
import { UpcomingMissionBadge } from './UpcomingMissionBadge';
import { EmploymentStatus, employmentStatusLabels } from '@/utils/employmentStatus';
import { Profile } from '@/types/profile';

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
    work_hours?: {
      start_morning?: string;
      end_morning?: string;
      start_afternoon?: string;
      end_afternoon?: string;
    } | null;
  };
}

const statusLabels = {
  available: 'Disponible',
  busy: 'En appel',
  pause: 'En pause',
  unavailable: 'Indisponible',
};

const InterpreterCard: React.FC<InterpreterCardProps> = ({ interpreter }) => {
  const parsedLanguages = interpreter.languages
    .map(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return { source, target };
    })
    .filter(lang => lang.source && lang.target);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col space-y-2">
        <div className="font-semibold text-lg">{interpreter.name}</div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{employmentStatusLabels[interpreter.employment_status]}</Badge>
          <Badge
            className={`text-white ${
              interpreter.status === 'available'
                ? 'bg-green-500'
                : interpreter.status === 'busy'
                ? 'bg-red-500'
                : interpreter.status === 'pause'
                ? 'bg-yellow-500'
                : 'bg-gray-500'
            }`}
          >
            {statusLabels[interpreter.status]}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4 text-gray-500" />
          <div className="flex space-x-1">
            {parsedLanguages.map((lang, index) => (
              <Badge key={index} variant="outline">
                {lang.source} → {lang.target}
              </Badge>
            ))}
          </div>
        </div>
        {interpreter.phone_number && (
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span>{interpreter.phone_number}</span>
          </div>
        )}
        {interpreter.booth_number && (
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span>Booth: {interpreter.booth_number}</span>
          </div>
        )}
        {interpreter.tarif_15min !== null && interpreter.tarif_5min !== null && (
          <div className="text-sm text-gray-500">
            Tarif 5min: {interpreter.tarif_5min}€ | Tarif 15min: {interpreter.tarif_15min}€
          </div>
        )}
        {interpreter.next_mission_start && (
          <UpcomingMissionBadge
            startTime={interpreter.next_mission_start}
            estimatedDuration={interpreter.next_mission_duration || 0}
            sourceLang={interpreter.next_mission_source_language}
            targetLang={interpreter.next_mission_target_language}
          />
        )}
        {interpreter.work_hours && (
          <div className="text-sm text-gray-500">
            Work Hours: {interpreter.work_hours.start_morning} - {interpreter.work_hours.end_morning}, {interpreter.work_hours.start_afternoon} - {interpreter.work_hours.end_afternoon}
          </div>
        )}
        {interpreter.private_phone && (
          <div className="text-sm text-gray-500">
            Private Phone: {interpreter.private_phone}
          </div>
        )}
         {interpreter.professional_phone && (
          <div className="text-sm text-gray-500">
            Professional Phone: {interpreter.professional_phone}
          </div>
        )}
      </div>
    </Card>
  );
};

export default InterpreterCard;
