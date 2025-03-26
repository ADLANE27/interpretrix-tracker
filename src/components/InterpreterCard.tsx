
import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Phone, Clock, User, PhoneCall, Home, Building, RotateCw } from 'lucide-react';
import { UpcomingMissionBadge } from './UpcomingMissionBadge';
import { EmploymentStatus, employmentStatusLabels } from '@/utils/employmentStatus';
import { Profile } from '@/types/profile';
import { WorkLocation, workLocationLabels } from '@/utils/workLocationStatus';
import { InterpreterStatusDropdown } from './admin/interpreter/InterpreterStatusDropdown';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

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

const employmentStatusConfig = {
  salaried_aft: {
    color: 'bg-indigo-100 text-indigo-800 border border-indigo-300',
  },
  salaried_aftcom: {
    color: 'bg-violet-100 text-violet-800 border border-violet-300',
  },
  salaried_planet: {
    color: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  },
  self_employed: {
    color: 'bg-amber-100 text-amber-800 border border-amber-300',
  },
  permanent_interpreter: {
    color: 'bg-teal-100 text-teal-800 border border-teal-300',
  },
  permanent_interpreter_aftcom: {
    color: 'bg-sky-100 text-sky-800 border border-sky-300',
  }
};

const InterpreterCard: React.FC<InterpreterCardProps> = ({ interpreter, onStatusChange }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
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
  const employmentStatus = interpreter.employment_status;
  const employmentStatusColorClass = employmentStatusConfig[employmentStatus]?.color || 'bg-gray-100 text-gray-800 border border-gray-300';

  const handleStatusChange = (newStatus: Profile['status']) => {
    if (onStatusChange) {
      onStatusChange(interpreter.id, newStatus);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

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
        className={`hover-elevate gradient-border w-full h-full backface-hidden ${isFlipped ? 'invisible' : 'visible'}`}
      >
        <CardContent className="p-2 relative">
          {/* Front card content */}
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <InterpreterStatusDropdown 
                interpreterId={interpreter.id}
                currentStatus={interpreter.status}
                displayFormat="badge"
                onStatusChange={handleStatusChange}
                className="text-[10px] px-2 py-0.5"
              />
              <h3 className="text-xs font-medium text-gradient-primary truncate">{interpreter.name}</h3>
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
          
          {/* All badges section */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            <div className={`px-2 py-0.5 rounded-full text-[10px] flex items-center gap-0.5 ${workLocationConfig[workLocation].color}`}>
              <LocationIcon className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">{workLocationLabels[workLocation]}</span>
            </div>
            
            <div className={`px-2 py-0.5 rounded-full text-[10px] flex items-center gap-0.5 ${employmentStatusColorClass}`}>
              <span>{employmentStatusLabels[employmentStatus]}</span>
            </div>

            <div className="text-[10px] text-muted-foreground">
              {parsedLanguages.length} {parsedLanguages.length > 1 ? "langues" : "langue"}
            </div>
          </div>

          {/* Upcoming Mission Section - Highlighted */}
          {interpreter.next_mission_start && (
            <div className="mb-2">
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
                sourceLang={interpreter.next_mission_source_language}
                targetLang={interpreter.next_mission_target_language}
              />
            </div>
          )}

          {/* Contact Information Section with improved readability */}
          {hasAnyPhoneNumber && (
            <div className="grid grid-cols-1 gap-y-1 text-xs text-muted-foreground mb-2">
              {interpreter.booth_number && (
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-palette-ocean-blue" />
                  <span>Cabine {interpreter.booth_number}</span>
                </div>
              )}
              {interpreter.phone_number && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-palette-ocean-blue" />
                  <span>{interpreter.phone_number}</span>
                </div>
              )}
              {interpreter.landline_phone && (
                <div className="flex items-center gap-1">
                  <PhoneCall className="h-3.5 w-3.5 text-palette-ocean-blue" />
                  <span>{interpreter.landline_phone}</span>
                </div>
              )}
              {interpreter.private_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-palette-ocean-blue" />
                  <span>{interpreter.private_phone}</span>
                </div>
              )}
              {interpreter.professional_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-palette-ocean-blue" />
                  <span>{interpreter.professional_phone}</span>
                </div>
              )}
              {interpreter.work_hours && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-palette-ocean-blue" />
                  <span>
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

          {/* Footer Section with Rates */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-end text-[10px] text-muted-foreground pt-1 border-t border-slate-100">
            {(interpreter.tarif_15min !== null || interpreter.tarif_5min !== null) && (
              <span>
                {interpreter.tarif_5min !== null && `5min: ${interpreter.tarif_5min}€`}
                {interpreter.tarif_5min !== null && interpreter.tarif_15min !== null && ' | '}
                {interpreter.tarif_15min !== null && `15min: ${interpreter.tarif_15min}€`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Back side of the card */}
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
        className={`hover-elevate gradient-border w-full h-full backface-hidden absolute top-0 left-0 ${isFlipped ? 'visible' : 'invisible'}`}
      >
        <CardContent className="p-2 relative">
          {/* Back card header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gradient-primary truncate">{interpreter.name}</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 rounded-full" 
              onClick={flipCard}
            >
              <RotateCw className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
          
          {/* Languages section - now shown on the back */}
          <div className="mb-1 text-xs font-medium text-muted-foreground">Combinaisons de langues:</div>
          <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto pr-1 hide-scrollbar">
            {parsedLanguages.map((lang, index) => (
              <div
                key={index}
                className="px-1.5 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded text-[10px] flex items-center gap-0.5"
              >
                <span>{lang.source}</span>
                <span className="text-palette-vivid-purple">→</span>
                <span>{lang.target}</span>
              </div>
            ))}
          </div>
          
          {/* Footer with badges for context */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pt-1 border-t border-slate-100">
            <div className="flex flex-wrap gap-1">
              <div className={`px-2 py-0.5 rounded-full text-[10px] flex items-center gap-0.5 ${employmentStatusColorClass}`}>
                <span>{employmentStatusLabels[employmentStatus]}</span>
              </div>
              <div className={`px-2 py-0.5 rounded-full text-[10px] flex items-center gap-0.5 ${workLocationConfig[workLocation].color}`}>
                <LocationIcon className="h-2.5 w-2.5" />
                <span>{workLocationLabels[workLocation]}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterpreterCard;
