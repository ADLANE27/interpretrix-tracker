
import React from 'react';
import { Card } from './ui/card';
import { Phone, Clock, User } from 'lucide-react';
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

const statusConfig = {
  available: { color: 'bg-interpreter-available', label: 'Disponible' },
  busy: { color: 'bg-interpreter-busy', label: 'En appel' },
  pause: { color: 'bg-interpreter-pause', label: 'En pause' },
  unavailable: { color: 'bg-interpreter-unavailable', label: 'Indisponible' },
};

const InterpreterCard: React.FC<InterpreterCardProps> = ({ interpreter }) => {
  const parsedLanguages = interpreter.languages
    .map(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return { source, target };
    })
    .filter(lang => lang.source && lang.target);

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="space-y-6">
        {/* Header with name and status */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">{interpreter.name}</h3>
            <p className="text-sm text-muted-foreground">
              {employmentStatusLabels[interpreter.employment_status]}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm text-white ${statusConfig[interpreter.status].color}`}>
            {statusConfig[interpreter.status].label}
          </div>
        </div>

        {/* Languages Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium uppercase text-muted-foreground">LANGUES</h4>
          <div className="flex flex-wrap gap-2">
            {parsedLanguages.map((lang, index) => (
              <div
                key={index}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center gap-1"
              >
                <span>{lang.source}</span>
                <span className="text-blue-400">→</span>
                <span>{lang.target}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium uppercase text-muted-foreground">CONTACT</h4>
          <div className="space-y-2">
            {interpreter.phone_number && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{interpreter.phone_number}</span>
              </div>
            )}
            {interpreter.work_hours && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {interpreter.work_hours.start_morning} - {interpreter.work_hours.end_morning}, {' '}
                  {interpreter.work_hours.start_afternoon} - {interpreter.work_hours.end_afternoon}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        {(interpreter.next_mission_start || interpreter.tarif_15min || interpreter.tarif_5min) && (
          <div className="border-t pt-4 space-y-3">
            {interpreter.next_mission_start && (
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
                sourceLang={interpreter.next_mission_source_language}
                targetLang={interpreter.next_mission_target_language}
              />
            )}
            {(interpreter.tarif_15min !== null || interpreter.tarif_5min !== null) && (
              <div className="text-sm text-muted-foreground">
                {interpreter.tarif_5min !== null && `Tarif 5min: ${interpreter.tarif_5min}€`}
                {interpreter.tarif_5min !== null && interpreter.tarif_15min !== null && ' | '}
                {interpreter.tarif_15min !== null && `Tarif 15min: ${interpreter.tarif_15min}€`}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default InterpreterCard;
