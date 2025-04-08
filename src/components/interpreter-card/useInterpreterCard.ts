
import { useState, useEffect, useRef, useCallback } from 'react';
import { Profile } from '@/types/profile';
import { WorkLocation } from '@/utils/workLocationStatus';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { Home, Building } from 'lucide-react';
import { isPast, isToday, addMinutes, parseISO, startOfDay, endOfDay } from 'date-fns';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';

export interface MissionInfo {
  start_time: string;
  duration: number;
  source_language?: string | null;
  target_language?: string | null;
}

interface UseInterpreterCardProps {
  id: string;
  name: string;
  status: Profile['status'];
  languages: string[];
  missions: MissionInfo[];
  phone_number: string | null;
  landline_phone?: string | null;
  private_phone?: string | null;
  professional_phone?: string | null;
  booth_number?: string | null;
  tarif_5min: number | null;
  tarif_15min: number | null;
  work_location?: WorkLocation;
}

export const useInterpreterCard = (
  interpreter: UseInterpreterCardProps,
  onStatusChange?: (interpreterId: string, newStatus: Profile['status']) => void
) => {
  const { id: interpreterId, status: initialStatus, missions } = interpreter;
  const [status, setStatus] = useState<Profile['status']>(initialStatus);
  const [isFlipped, setIsFlipped] = useState(false);
  const prevStatusRef = useRef<Profile['status']>(initialStatus);
  const didMountRef = useRef(false);
  
  const handleStatusChangeCallback = useCallback((newStatus: Profile['status']) => {
    console.log(`[InterpreterCard] Status changed to: ${newStatus} for ${interpreterId}`);
    setStatus(newStatus);
    prevStatusRef.current = newStatus;
    
    if (onStatusChange) {
      onStatusChange(interpreterId, newStatus);
    }
  }, [interpreterId, onStatusChange]);
  
  const { updateStatus, isConnected } = useRealtimeStatus({
    interpreterId,
    initialStatus,
    onStatusChange: handleStatusChangeCallback
  });
  
  const flipCard = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  // Effect to sync status from props
  useEffect(() => {
    if (didMountRef.current && initialStatus !== status && initialStatus !== prevStatusRef.current) {
      console.log(`[InterpreterCard] Status updated from prop for ${interpreter.name}: ${initialStatus}`);
      setStatus(initialStatus);
      prevStatusRef.current = initialStatus;
    }
    
    didMountRef.current = true;
  }, [initialStatus, status, interpreter.name]);

  const handleStatusChange = useCallback(async (newStatus: Profile['status']) => {
    console.log(`[InterpreterCard] Status change requested for ${interpreter.name} to ${newStatus}`);
    
    // Only update if status is actually changing
    if (newStatus !== status) {
      setStatus(newStatus);
      prevStatusRef.current = newStatus;
      
      if (onStatusChange) {
        onStatusChange(interpreterId, newStatus);
      }
      
      // Update status through hook
      try {
        await updateStatus(newStatus);
      } catch (error) {
        console.error(`[InterpreterCard] Failed to update status for ${interpreter.name}:`, error);
      }
    }
  }, [interpreterId, interpreter.name, onStatusChange, status, updateStatus]);

  const parsedLanguages = interpreter.languages
    .map(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return { source, target };
    })
    .filter(lang => lang.source && lang.target);

  const hasAnyPhoneNumber = Boolean(
    interpreter.phone_number || 
    interpreter.landline_phone || 
    interpreter.private_phone || 
    interpreter.professional_phone || 
    interpreter.booth_number
  );

  const workLocation = interpreter.work_location || "on_site";
  
  const locationConfig = {
    remote: {
      color: "bg-purple-100 text-purple-800 border border-purple-300",
      icon: Home
    },
    on_site: {
      color: "bg-blue-100 text-blue-800 border border-blue-300",
      icon: Building
    }
  };

  const showTarif5min = interpreter.tarif_5min !== null && interpreter.tarif_5min > 0;
  const showTarif15min = interpreter.tarif_15min !== null && interpreter.tarif_15min > 0;
  const showAnyTarif = showTarif5min || showTarif15min;

  // Filter today's missions - including future, in-progress, and ended missions from today
  const todaysMissions = missions.filter(mission => {
    const missionDate = parseISO(mission.start_time);
    return isToday(missionDate);
  });

  // Sort today's missions by start time
  const sortedMissions = [...todaysMissions].sort((a, b) => {
    return parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime();
  });

  // Check if there are any future missions (upcoming or in progress)
  const hasActiveMissions = missions.some(mission => {
    const missionEndDate = addMinutes(parseISO(mission.start_time), mission.duration);
    return !isPast(missionEndDate);
  });

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
    showAnyTarif,
    hasActiveMissions,
    todaysMissions: sortedMissions,
    isConnected
  };
};
