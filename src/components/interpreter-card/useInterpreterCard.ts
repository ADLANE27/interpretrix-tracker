
import { useState, useEffect, useRef } from 'react';
import { Profile } from '@/types/profile';
import { WorkLocation } from '@/utils/workLocationStatus';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { Home, Building } from 'lucide-react';
import { isPast, addMinutes, parseISO } from 'date-fns';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';

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
  const [status, setStatus] = useState(interpreter.status);
  const [isFlipped, setIsFlipped] = useState(false);
  const prevStatusRef = useRef<Profile['status']>(interpreter.status);
  
  const flipCard = () => {
    setIsFlipped(prev => !prev);
  };
  
  const { updateStatus, isConnected } = useRealtimeStatus({
    interpreterId: interpreter.id,
    initialStatus: interpreter.status,
    onStatusChange: (newStatus) => {
      console.log(`[InterpreterCard] Status sync updated status to: ${newStatus}`);
      setStatus(newStatus);
      
      if (onStatusChange && newStatus !== prevStatusRef.current) {
        onStatusChange(interpreter.id, newStatus);
      }
      
      prevStatusRef.current = newStatus;
    }
  });
  
  // Listen for global status updates
  useEffect(() => {
    const handleStatusUpdate = (data: { interpreterId: string, status: Profile['status'] }) => {
      if (data.interpreterId === interpreter.id && data.status !== status) {
        console.log(`[InterpreterCard] Global status update for ${interpreter.name} to ${data.status}`);
        setStatus(data.status);
        prevStatusRef.current = data.status;
      }
    };
    
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [interpreter.id, interpreter.name, status]);
  
  // Effect to sync status from props
  useEffect(() => {
    if (interpreter.status !== status && interpreter.status !== prevStatusRef.current) {
      console.log(`[InterpreterCard] Status updated from prop for ${interpreter.name}: ${interpreter.status}`);
      setStatus(interpreter.status);
      prevStatusRef.current = interpreter.status;
    }
  }, [interpreter.status, status, interpreter.name]);

  const handleStatusChange = async (newStatus: Profile['status']) => {
    console.log(`[InterpreterCard] Status change requested for ${interpreter.name} to ${newStatus}`);
    setStatus(newStatus);
    prevStatusRef.current = newStatus;
    
    if (onStatusChange) {
      onStatusChange(interpreter.id, newStatus);
    }
    
    // Also update the status in the database
    try {
      await updateStatus(newStatus);
    } catch (error) {
      console.error(`[InterpreterCard] Failed to update status for ${interpreter.name}:`, error);
    }
  };

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

  const hasFutureMission = interpreter.next_mission_start && 
    !isPast(addMinutes(
      parseISO(interpreter.next_mission_start), 
      interpreter.next_mission_duration || 0
    ));

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
    hasFutureMission,
    isConnected
  };
};
