
import { useState, useEffect, useRef, useCallback } from 'react';
import { Profile } from '@/types/profile';
import { WorkLocation } from '@/utils/workLocationStatus';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { Home, Building } from 'lucide-react';
import { isPast, isAfter, addMinutes, parseISO, isWithinInterval } from 'date-fns';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_MISSION_STATUS_UPDATE } from '@/lib/events';

interface UseInterpreterCardProps {
  id: string;
  name: string;
  status: Profile['status'];
  languages: string[];
  next_mission_start: string | null;
  next_mission_duration: number | null;
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
  const { id: interpreterId, status: initialStatus } = interpreter;
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

  // Listen for mission status updates to re-evaluate mission state
  useEffect(() => {
    const handleMissionStatusUpdate = () => {
      // Re-evaluate mission status
      checkMissionStatus();
    };
    
    eventEmitter.on(EVENT_MISSION_STATUS_UPDATE, handleMissionStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_MISSION_STATUS_UPDATE, handleMissionStatusUpdate);
    };
  }, [interpreter.next_mission_start, interpreter.next_mission_duration]);

  // Function to check if a mission is currently in progress or upcoming
  const checkMissionStatus = useCallback(() => {
    if (!interpreter.next_mission_start || !interpreter.next_mission_duration) {
      return false;
    }
    
    const now = new Date();
    const missionStartDate = parseISO(interpreter.next_mission_start);
    const missionEndDate = addMinutes(missionStartDate, interpreter.next_mission_duration);
    
    // Check if mission is in progress
    if (isWithinInterval(now, { start: missionStartDate, end: missionEndDate })) {
      return true;
    }
    
    // Check if mission is upcoming
    return isAfter(missionStartDate, now);
  }, [interpreter.next_mission_start, interpreter.next_mission_duration]);

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

  // Check if the mission is current or in the future
  const hasMission = interpreter.next_mission_start && checkMissionStatus();

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
    hasFutureMission: hasMission,
    isConnected
  };
};
