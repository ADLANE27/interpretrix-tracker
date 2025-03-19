
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Phone, Clock, User, PhoneCall } from 'lucide-react';
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
    landline_phone?: string | null;
    work_hours?: {
      start_morning?: string;
      end_morning?: string;
      start_afternoon?: string;
      end_afternoon?: string;
    } | null;
  };
}

const statusConfig = {
  available: { 
    color: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm', 
    label: 'Disponible' 
  },
  busy: { 
    color: 'bg-gradient-to-r from-indigo-400 to-purple-500 text-white shadow-sm', 
    label: 'En appel' 
  },
  pause: { 
    color: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm', 
    label: 'En pause' 
  },
  unavailable: { 
    color: 'bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-sm', 
    label: 'Indisponible' 
  },
};

const InterpreterCard: React.FC<InterpreterCardProps> = ({ interpreter }) => {
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

  return (
    <Card className="hover-elevate gradient-border">
      <CardHeader className="card-header-gradient">
        <div className="flex items-center justify-between">
          <CardTitle className="text-gradient-primary">{interpreter.name}</CardTitle>
          <div className={`px-3 py-1 rounded-full text-sm ${statusConfig[interpreter.status].color}`}>
            {statusConfig[interpreter.status].label}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {employmentStatusLabels[interpreter.employment_status]}
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Languages Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium uppercase text-muted-foreground">LANGUES</h4>
          <div className="flex flex-wrap gap-2">
            {parsedLanguages.map((lang, index) => (
              <div
                key={index}
                className="px-3 py-1 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded-lg text-sm flex items-center gap-1 shadow-sm"
              >
                <span>{lang.source}</span>
                <span className="text-palette-vivid-purple">→</span>
                <span>{lang.target}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        {hasAnyPhoneNumber && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium uppercase text-muted-foreground">CONTACT</h4>
            <div className="space-y-2">
              {interpreter.booth_number && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-palette-ocean-blue" />
                  <span>Cabine {interpreter.booth_number}</span>
                </div>
              )}
              
              {interpreter.phone_number && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-palette-ocean-blue" />
                  <span>Mobile: {interpreter.phone_number}</span>
                </div>
              )}
              
              {interpreter.landline_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <PhoneCall className="h-4 w-4 text-palette-ocean-blue" />
                  <span>Fixe: {interpreter.landline_phone}</span>
                </div>
              )}
              
              {interpreter.private_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-palette-ocean-blue" />
                  <span>Tél. personnel: {interpreter.private_phone}</span>
                </div>
              )}
              
              {interpreter.professional_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-palette-ocean-blue" />
                  <span>Tél. professionnel: {interpreter.professional_phone}</span>
                </div>
              )}
              
              {interpreter.work_hours && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-palette-ocean-blue" />
                  <span>
                    {interpreter.work_hours.start_morning} - {interpreter.work_hours.end_morning}, {' '}
                    {interpreter.work_hours.start_afternoon} - {interpreter.work_hours.end_afternoon}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Additional Info */}
      {(interpreter.next_mission_start || interpreter.tarif_15min || interpreter.tarif_5min) && (
        <CardFooter className="flex flex-col items-start border-t pt-4 space-y-3">
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
        </CardFooter>
      )}
    </Card>
  );
};

export default InterpreterCard;
