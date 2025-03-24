
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Globe, Home, Building, Phone, Clock, User, PhoneCall } from 'lucide-react';
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
  const [interpreterStatus, setInterpreterStatus] = useState<Profile['status']>(interpreter.status);
  
  // Update local state when props change
  useEffect(() => {
    if (interpreter.status !== interpreterStatus) {
      console.log(`[InterpreterCard] Status updated from props for ${interpreter.id}:`, interpreter.status);
      setInterpreterStatus(interpreter.status);
    }
  }, [interpreter.status, interpreter.id, interpreterStatus]);
  
  // Listen for direct status update events
  useEffect(() => {
    const handleStatusUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.interpreterId === interpreter.id) {
        console.log(`[InterpreterCard] Received direct status update event for ${interpreter.id}:`, event.detail.status);
        setInterpreterStatus(event.detail.status);
      }
    };
    
    window.addEventListener('update-interpreter-status', handleStatusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('update-interpreter-status', handleStatusUpdate as EventListener);
    };
  }, [interpreter.id]);

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
    console.log(`[InterpreterCard] Status change requested for ${interpreter.id}:`, newStatus);
    setInterpreterStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(interpreter.id, newStatus);
    }
  };

  return (
    <Card className="hover-elevate gradient-border">
      <CardHeader className="card-header-gradient">
        <div className="flex items-center justify-between">
          <CardTitle className="text-gradient-primary">{interpreter.name}</CardTitle>
          <InterpreterStatusDropdown 
            interpreterId={interpreter.id}
            currentStatus={interpreterStatus}
            displayFormat="badge"
            onStatusChange={handleStatusChange}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {employmentStatusLabels[interpreter.employment_status]}
          </p>
          <div className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${workLocationConfig[workLocation].color}`}>
            <LocationIcon className="h-3 w-3" />
            <span>{workLocationLabels[workLocation]}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
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
