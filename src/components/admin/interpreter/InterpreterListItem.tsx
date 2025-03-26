
import React from 'react';
import { Profile } from '@/types/profile';
import { WorkLocation, workLocationLabels } from '@/utils/workLocationStatus';
import { EmploymentStatus, employmentStatusLabels } from '@/utils/employmentStatus';
import { InterpreterStatusDropdown } from './InterpreterStatusDropdown';
import { UpcomingMissionBadge } from '@/components/UpcomingMissionBadge';
import { Home, Building, Phone, User, PhoneCall, Clock } from 'lucide-react';

interface InterpreterListItemProps {
  interpreter: {
    id: string;
    name: string;
    status: Profile['status'];
    employment_status: EmploymentStatus;
    languages: string[];
    next_mission_start: string | null;
    next_mission_duration: number | null;
    next_mission_source_language?: string | null;
    next_mission_target_language?: string | null;
    phone_number?: string | null;
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
    work_location: WorkLocation;
  };
  onStatusChange: (interpreterId: string, newStatus: Profile['status']) => void;
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

export const InterpreterListItem: React.FC<InterpreterListItemProps> = ({
  interpreter,
  onStatusChange,
}) => {
  const workLocation = interpreter.work_location || "on_site";
  const LocationIcon = workLocationConfig[workLocation].icon;
  
  // Determine primary contact for display
  const getContacts = () => {
    const contacts = [];
    
    if (interpreter.booth_number) {
      contacts.push({ icon: User, label: `Cabine ${interpreter.booth_number}` });
    }
    if (interpreter.phone_number) {
      contacts.push({ icon: Phone, label: interpreter.phone_number });
    }
    if (interpreter.professional_phone) {
      contacts.push({ icon: Phone, label: interpreter.professional_phone });
    }
    if (interpreter.private_phone) {
      contacts.push({ icon: Phone, label: interpreter.private_phone });
    }
    if (interpreter.landline_phone) {
      contacts.push({ icon: PhoneCall, label: interpreter.landline_phone });
    }
    
    return contacts;
  };

  const contacts = getContacts();
  
  const getLanguageDisplay = () => {
    const parsedLanguages = interpreter.languages
      .map(lang => {
        const [source, target] = lang.split('→').map(l => l.trim());
        return { source, target };
      })
      .filter(lang => lang.source && lang.target);
      
    if (parsedLanguages.length === 0) return "";
    
    if (parsedLanguages.length === 1) {
      return `${parsedLanguages[0].source} → ${parsedLanguages[0].target}`;
    }
    
    return `${parsedLanguages[0].source} → ${parsedLanguages[0].target} +${parsedLanguages.length - 1}`;
  };

  return (
    <div className="bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="grid grid-cols-12 gap-2 items-center">
        {/* Name and status - 3 columns */}
        <div className="col-span-3">
          <div className="font-medium truncate">{interpreter.name}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {employmentStatusLabels[interpreter.employment_status]}
            </span>
            <div className={`px-1 py-0.5 rounded-full text-xs flex items-center gap-0.5 ${workLocationConfig[workLocation].color}`}>
              <LocationIcon className="h-3 w-3" />
              <span>{workLocationLabels[workLocation]}</span>
            </div>
          </div>
        </div>
        
        {/* Languages - 2 columns */}
        <div className="col-span-2 text-sm">
          {getLanguageDisplay()}
        </div>
        
        {/* Contact info - 3 columns */}
        <div className="col-span-3">
          {contacts.length > 0 ? (
            <div className="space-y-1">
              {contacts.slice(0, 2).map((contact, index) => (
                <div key={index} className="flex items-center gap-1 text-sm text-slate-600">
                  <contact.icon className="h-3.5 w-3.5 text-palette-ocean-blue" />
                  <span className="truncate">{contact.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Aucun contact</span>
          )}
          {interpreter.work_hours && (
            <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
              <Clock className="h-3 w-3 text-palette-ocean-blue" />
              <span className="truncate">
                {interpreter.work_hours.start_morning}-{interpreter.work_hours.end_morning}, {interpreter.work_hours.start_afternoon}-{interpreter.work_hours.end_afternoon}
              </span>
            </div>
          )}
        </div>
        
        {/* Next mission - 3 columns */}
        <div className="col-span-3 pr-2">
          {interpreter.next_mission_start ? (
            <UpcomingMissionBadge
              startTime={interpreter.next_mission_start}
              estimatedDuration={interpreter.next_mission_duration || 0}
              sourceLang={interpreter.next_mission_source_language}
              targetLang={interpreter.next_mission_target_language}
            />
          ) : (
            <span className="text-xs text-muted-foreground">Aucune mission prévue</span>
          )}
        </div>
        
        {/* Status dropdown - 1 column */}
        <div className="col-span-1 flex justify-end">
          <InterpreterStatusDropdown
            interpreterId={interpreter.id}
            currentStatus={interpreter.status}
            displayFormat="dropdown"
            onStatusChange={(newStatus) => onStatusChange(interpreter.id, newStatus)}
          />
        </div>
      </div>
    </div>
  );
};
