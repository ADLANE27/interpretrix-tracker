
import { useState, useEffect, useCallback, useRef } from 'react';
import { Profile } from '@/types/profile';
import { EmploymentStatus } from '@/utils/employmentStatus';
import { WorkLocation } from '@/utils/workLocationStatus';
import { eventEmitter, EVENT_INTERPRETER_BADGE_UPDATE } from '@/lib/events';
import { LanguageMap } from '@/utils/languageUtils';

interface Interpreter {
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
}

type UseInterpreterCardReturn = {
  status: Profile['status'];
  isFlipped: boolean;
  flipCard: () => void;
  handleStatusChange: (newStatus: Profile['status']) => void;
  parsedLanguages: Array<{source: string, target: string}>;
  hasAnyPhoneNumber: boolean;
  workLocation: WorkLocation;
  locationConfig: {
    icon: string;
    label: string;
    color: string;
  };
  showTarif5min: boolean;
  showTarif15min: boolean;
  hasFutureMission: boolean;
};

export function useInterpreterCard(
  interpreter: Interpreter,
  onStatusChange?: (interpreterId: string, newStatus: Profile['status']) => void
): UseInterpreterCardReturn {
  const [status, setStatus] = useState<Profile['status']>(interpreter.status);
  const [isFlipped, setIsFlipped] = useState(false);
  const statusRef = useRef<Profile['status']>(interpreter.status);

  // Listen for badge-specific status updates
  useEffect(() => {
    const handleBadgeUpdate = ({ interpreterId, status: newStatus }: { interpreterId: string, status: Profile['status'] }) => {
      if (interpreterId === interpreter.id && newStatus !== statusRef.current) {
        console.log(`[InterpreterCard] Updating badge for ${interpreterId} to ${newStatus} (was ${statusRef.current})`);
        setStatus(newStatus);
        statusRef.current = newStatus;
      }
    };
    
    eventEmitter.on(EVENT_INTERPRETER_BADGE_UPDATE, handleBadgeUpdate);
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_BADGE_UPDATE, handleBadgeUpdate);
    };
  }, [interpreter.id]);

  // Also update when the prop changes (for initial render)
  useEffect(() => {
    if (interpreter.status !== statusRef.current) {
      setStatus(interpreter.status);
      statusRef.current = interpreter.status;
      console.log(`[InterpreterCard] Status prop updated for ${interpreter.id} to ${interpreter.status}`);
    }
  }, [interpreter.status, interpreter.id]);

  const flipCard = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleStatusChange = useCallback((newStatus: Profile['status']) => {
    if (onStatusChange) {
      onStatusChange(interpreter.id, newStatus);
    }
  }, [interpreter.id, onStatusChange]);

  const parsedLanguages = interpreter.languages.map(lang => {
    const parts = lang.split('→').map(part => part.trim());
    return {
      source: parts[0],
      target: parts[1] || ''
    };
  });

  const hasAnyPhoneNumber = !!(
    interpreter.phone_number || 
    interpreter.private_phone || 
    interpreter.professional_phone || 
    interpreter.landline_phone
  );

  const workLocation = interpreter.work_location || 'on_site';

  const locationConfig = {
    on_site: {
      icon: 'building',
      label: 'Sur site',
      color: 'bg-blue-100 text-blue-800'
    },
    remote: {
      icon: 'home',
      label: 'À distance',
      color: 'bg-green-100 text-green-800'
    },
    hybrid: {
      icon: 'shuffle',
      label: 'Hybride',
      color: 'bg-purple-100 text-purple-800'
    }
  }[workLocation];

  const showTarif5min = interpreter.tarif_5min !== null && interpreter.tarif_5min > 0;
  const showTarif15min = interpreter.tarif_15min !== null && interpreter.tarif_15min > 0;
  const hasFutureMission = !!interpreter.next_mission_start;

  return {
    status,
    isFlipped,
    flipCard,
    handleStatusChange,
    parsedLanguages,
    hasAnyPhoneNumber,
    workLocation,
    locationConfig,
    showTarif5min,
    showTarif15min,
    hasFutureMission
  };
}
