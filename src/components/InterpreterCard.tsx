
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
import { format, parseISO } from 'date-fns';

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

  const handleStatusChange = (newStatus: Profile['status']) => {
    if (onStatusChange) {
      onStatusChange(interpreter.id, newStatus);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  // Format next mission date to short format DD/MM/YYYY
  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  return (
    <div className="preserve-3d perspective-1000 w-full aspect-square relative">
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
          {/* Front card content with badges on same level */}
          <div className="flex items-center justify-between gap-1 mb-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
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
          
          {/* Interpreter name with larger font */}
          <h3 className="text-sm font-medium text-gradient-primary truncate mb-2">{interpreter.name}</h3>
          
          {/* Language count summary */}
          <div className="mb-2 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">
              {parsedLanguages.length} {parsedLanguages.length > 1 ? "langues" : "langue"}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 rounded-full" 
              onClick={flipCard}
            >
              <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>

          {/* Upcoming Mission Section with shorter date format */}
          {interpreter.next_mission_start && (
            <div className="mb-2">
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
                sourceLang={interpreter.next_mission_source_language}
                targetLang={interpreter.next_mission_target_language}
                useShortDateFormat={true}
              />
            </div>
          )}

          {/* Contact Information Section with larger font */}
          {hasAnyPhoneNumber && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-foreground mb-2">
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
                <div className="flex items-center gap-1 col-span-2">
                  <Clock className="h-3.5 w-3.5 text-palette-ocean-blue" />
                  <span className="text-xs">
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

          {/* Remove the footer section with rates */}
        </CardContent>
      </Card>

      {/* Back side of the card - with ONLY languages */}
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
            <h3 className="text-sm font-medium text-gradient-primary truncate">{interpreter.name}</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 rounded-full" 
              onClick={flipCard}
            >
              <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
          
          {/* Languages section - now shown on the back */}
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
