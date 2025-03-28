
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';
import { Profile } from '@/types/profile';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';

interface UseInterpreterStatusSyncOptions {
  interpreterId: string;
  onStatusChange?: (newStatus: Profile['status']) => void;
  initialStatus?: Profile['status'];
  isAdmin?: boolean;
}

/**
 * A simplified hook that wraps useRealtimeStatus for backward compatibility
 * @deprecated Use useRealtimeStatus directly instead
 */
export const useInterpreterStatusSync = ({
  interpreterId,
  onStatusChange,
  initialStatus = 'available',
  isAdmin = false
}: UseInterpreterStatusSyncOptions) => {
  const onStatusChangeRef = useRef(onStatusChange);
  
  // Update ref when prop changes
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);
  
  const {
    updateStatus
  } = useRealtimeStatus({
    interpreterId,
    initialStatus,
    onStatusChange: (newStatus) => {
      if (onStatusChangeRef.current) {
        onStatusChangeRef.current(newStatus);
      }
    }
  });
  
  return {
    updateStatus
  };
};
