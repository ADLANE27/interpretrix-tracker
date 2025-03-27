
import { useEffect, useState, useCallback } from 'react';
import { realtimeService } from '@/services/realtime';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { Profile } from '@/types/profile';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeStatusOptions {
  interpreterId?: string;
  onStatusChange?: (status: Profile['status']) => void;
  initialStatus?: Profile['status'];
  onConnectionStateChange?: (connected: boolean) => void;
}

/**
 * A hook to subscribe to and update interpreter status changes
 */
export const useRealtimeStatus = ({
  interpreterId,
  onStatusChange,
  initialStatus = 'available',
  onConnectionStateChange
}: UseRealtimeStatusOptions = {}) => {
  const [status, setStatus] = useState<Profile['status']>(initialStatus);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // Initialize the realtime service once
  useEffect(() => {
    const cleanup = realtimeService.init();
    return cleanup;
  }, []);
  
  // Handle connection status changes
  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
      
      if (onConnectionStateChange) {
        onConnectionStateChange(connected);
      }
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    };
  }, [onConnectionStateChange]);
  
  // Subscribe to status events for a specific interpreter
  useEffect(() => {
    if (!interpreterId) return;
    
    const handleStatusUpdate = ({ interpreterId: eventInterpreterId, status: newStatus }: { interpreterId: string, status: string }) => {
      if (eventInterpreterId === interpreterId) {
        setStatus(newStatus as Profile['status']);
        setLastUpdateTime(new Date());
        
        if (onStatusChange) {
          onStatusChange(newStatus as Profile['status']);
        }
      }
    };
    
    // Listen for broadcasted status updates (from other components/contexts)
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    
    // Subscribe to real-time database updates
    const handleStatusChange = (newStatus: Profile['status']) => {
      setStatus(newStatus);
      setLastUpdateTime(new Date());
      
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    };
    
    const cleanup = realtimeService.subscribeToInterpreterStatus(interpreterId, handleStatusChange);
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
      cleanup();
    };
  }, [interpreterId, onStatusChange]);
  
  // Refresh status if connection is restored
  useEffect(() => {
    if (!interpreterId) return;
    
    let timeoutId: NodeJS.Timeout;
    
    if (isConnected && lastUpdateTime === null) {
      // If we're connected but haven't received an update, refresh the status
      timeoutId = setTimeout(async () => {
        try {
          // Fetch the current status directly
          const { data, error } = await supabase
            .from('interpreter_profiles')
            .select('status')
            .eq('id', interpreterId)
            .single();
          
          if (!error && data) {
            setStatus(data.status as Profile['status']);
            setLastUpdateTime(new Date());
            
            if (onStatusChange) {
              onStatusChange(data.status as Profile['status']);
            }
          }
        } catch (error) {
          console.error('[useRealtimeStatus] Error fetching status:', error);
        }
      }, 2000);
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [interpreterId, isConnected, lastUpdateTime, onStatusChange]);
  
  /**
   * Update an interpreter's status
   */
  const updateStatus = useCallback(async (newStatus: Profile['status']): Promise<boolean> => {
    if (!interpreterId) return false;
    
    try {
      // Optimistically update the local state
      setStatus(newStatus);
      
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: newStatus
      });
      
      if (error) {
        console.error('[useRealtimeStatus] Error updating status:', error);
        // Revert on error
        setStatus(status);
        return false;
      }
      
      // Update last update time
      setLastUpdateTime(new Date());
      
      // Broadcast status change for other components 
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status: newStatus
      });
      
      return true;
    } catch (error) {
      console.error('[useRealtimeStatus] Unexpected error:', error);
      // Revert on error
      setStatus(status);
      return false;
    }
  }, [interpreterId, status]);
  
  return {
    status,
    updateStatus,
    isConnected,
    lastUpdateTime
  };
};
