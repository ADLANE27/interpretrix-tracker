
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Phone, Clock, User, PhoneCall, Home, Building, ChevronDown, ChevronUp, Globe, RefreshCw } from 'lucide-react';
import { UpcomingMissionBadge } from './UpcomingMissionBadge';
import { EmploymentStatus, employmentStatusLabels } from '@/utils/employmentStatus';
import { Profile } from '@/types/profile';
import { WorkLocation, workLocationLabels } from '@/utils/workLocationStatus';
import { InterpreterStatusDropdown } from './admin/interpreter/InterpreterStatusDropdown';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { motion } from 'framer-motion';

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
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  // Display the primary contact
  const getPrimaryContact = () => {
    if (interpreter.booth_number) {
      return { icon: User, label: `Cabine ${interpreter.booth_number}` };
    }
    if (interpreter.phone_number) {
      return { icon: Phone, label: interpreter.phone_number };
    }
    if (interpreter.professional_phone) {
      return { icon: Phone, label: interpreter.professional_phone };
    }
    if (interpreter.private_phone) {
      return { icon: Phone, label: interpreter.private_phone };
    }
    if (interpreter.landline_phone) {
      return { icon: PhoneCall, label: interpreter.landline_phone };
    }
    return null;
  };

  const primaryContact = getPrimaryContact();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="relative h-[220px] perspective-card">
      <motion.div 
        className="w-full h-full relative preserve-3d transition-transform"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Front Face */}
        <Card className="absolute w-full h-full backface-hidden p-2 bg-white/90 border-l-2 border-l-palette-ocean-blue hover:border-l-palette-vivid-purple">
          <div className="flex justify-between items-start p-2">
            <div className="flex-grow min-w-0">
              <div className="text-base font-medium truncate text-gradient-primary">{interpreter.name}</div>
              <div className="flex items-center gap-1 flex-wrap text-[10px]">
                <span className="text-muted-foreground">
                  {employmentStatusLabels[interpreter.employment_status]}
                </span>
                <div className={`px-1 py-0.5 rounded-full text-[10px] flex items-center gap-0.5 ${workLocationConfig[workLocation].color}`}>
                  <LocationIcon className="h-2.5 w-2.5" />
                  <span>{workLocationLabels[workLocation]}</span>
                </div>
              </div>
            </div>
            <InterpreterStatusDropdown 
              interpreterId={interpreter.id}
              currentStatus={interpreter.status}
              displayFormat="badge"
              onStatusChange={handleStatusChange}
              className="text-[10px] min-w-[70px] flex-shrink-0"
            />
          </div>

          <div className="p-2 space-y-1.5">
            {/* Contact Information - Always visible */}
            {primaryContact && (
              <div className="flex items-center gap-1 text-[11px] text-slate-600">
                <primaryContact.icon className="h-3 w-3 text-palette-ocean-blue flex-shrink-0" />
                <span className="truncate">{primaryContact.label}</span>
              </div>
            )}

            {/* Languages - Ultra compact display with tooltip */}
            <div className="flex items-center gap-1">
              <Globe className="h-3 w-3 text-palette-ocean-blue flex-shrink-0" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex overflow-hidden text-[11px]">
                      {parsedLanguages.length > 2 ? (
                        <span className="truncate">
                          {parsedLanguages[0].source}<span className="text-palette-vivid-purple">→</span>{parsedLanguages[0].target}
                          <span className="mx-0.5 text-gray-400">+{parsedLanguages.length - 1}</span>
                        </span>
                      ) : (
                        <span className="truncate">
                          {parsedLanguages.map((lang, index) => (
                            <React.Fragment key={index}>
                              {index > 0 && <span className="mx-0.5 text-gray-400">|</span>}
                              {lang.source}<span className="text-palette-vivid-purple">→</span>{lang.target}
                            </React.Fragment>
                          ))}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1 p-1">
                      {parsedLanguages.map((lang, index) => (
                        <div key={index} className="text-xs">
                          {lang.source} → {lang.target}
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Work Hours - Compact display */}
            {interpreter.work_hours && (
              <div className="flex items-center gap-1 text-[11px] text-slate-600">
                <Clock className="h-3 w-3 text-palette-ocean-blue flex-shrink-0" />
                <span className="truncate">
                  {interpreter.work_hours.start_morning} - {interpreter.work_hours.end_morning}, {' '}
                  {interpreter.work_hours.start_afternoon} - {interpreter.work_hours.end_afternoon}
                </span>
              </div>
            )}
          </div>

          {/* Upcoming Mission Badge */}
          {interpreter.next_mission_start && (
            <div className="px-2 mt-1">
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
                sourceLang={interpreter.next_mission_source_language}
                targetLang={interpreter.next_mission_target_language}
              />
            </div>
          )}

          {/* Rates */}
          {(interpreter.tarif_15min !== null || interpreter.tarif_5min !== null) && (
            <div className="flex pt-0 pb-1 px-2 text-[10px] text-muted-foreground mt-1">
              {interpreter.tarif_5min !== null && `Tarif 5min: ${interpreter.tarif_5min}€`}
              {interpreter.tarif_5min !== null && interpreter.tarif_15min !== null && ' | '}
              {interpreter.tarif_15min !== null && `Tarif 15min: ${interpreter.tarif_15min}€`}
            </div>
          )}

          {/* Flip Button */}
          <button 
            onClick={handleFlip}
            className="absolute bottom-1 right-1 p-1 rounded-full bg-white/80 text-slate-500 hover:text-palette-ocean-blue transition-colors"
            aria-label="Flip card"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </Card>

        {/* Back Face */}
        <Card className="absolute w-full h-full backface-hidden rotateY-180 p-2 bg-white/90 border-l-2 border-l-palette-vivid-purple">
          <div className="flex justify-between items-start p-2">
            <div className="flex-grow min-w-0">
              <div className="text-base font-medium truncate text-gradient-primary">{interpreter.name}</div>
              <div className="flex items-center gap-1 flex-wrap text-[10px]">
                <span className="text-muted-foreground">
                  {employmentStatusLabels[interpreter.employment_status]}
                </span>
              </div>
            </div>
            <InterpreterStatusDropdown 
              interpreterId={interpreter.id}
              currentStatus={interpreter.status}
              displayFormat="badge"
              onStatusChange={handleStatusChange}
              className="text-[10px] min-w-[70px] flex-shrink-0"
            />
          </div>

          <div className="p-2 overflow-y-auto h-[150px] text-[11px]">
            <div className="space-y-2">
              <h4 className="font-medium text-[12px] text-slate-700">Contact Information</h4>
              <div className="space-y-1">
                {interpreter.booth_number && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-palette-ocean-blue" />
                    <span>Cabine {interpreter.booth_number}</span>
                  </div>
                )}
                
                {interpreter.phone_number && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-palette-ocean-blue" />
                    <span>Mobile: {interpreter.phone_number}</span>
                  </div>
                )}
                
                {interpreter.landline_phone && (
                  <div className="flex items-center gap-1">
                    <PhoneCall className="h-3 w-3 text-palette-ocean-blue" />
                    <span>Fixe: {interpreter.landline_phone}</span>
                  </div>
                )}
                
                {interpreter.private_phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-palette-ocean-blue" />
                    <span>Tél. personnel: {interpreter.private_phone}</span>
                  </div>
                )}
                
                {interpreter.professional_phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-palette-ocean-blue" />
                    <span>Tél. professionnel: {interpreter.professional_phone}</span>
                  </div>
                )}
              </div>

              <h4 className="font-medium text-[12px] text-slate-700 mt-2">Langues</h4>
              <div className="space-y-1">
                {parsedLanguages.map((lang, index) => (
                  <div key={index} className="px-1.5 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded">
                    {lang.source}<span className="text-palette-vivid-purple">→</span>{lang.target}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Flip Button */}
          <button 
            onClick={handleFlip}
            className="absolute bottom-1 right-1 p-1 rounded-full bg-white/80 text-slate-500 hover:text-palette-ocean-blue transition-colors"
            aria-label="Flip card back"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </Card>
      </motion.div>
    </div>
  );
};

export default InterpreterCard;
