
import { useEffect, useState } from 'react';
import { realtimeService } from '@/services/realtimeService';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { Profile } from '@/types/profile';

interface UseRealtimeStatusOptions {
  interpreterId?: string;
  onStatusChange?: (status: Profile['status']) => void;
  initialStatus?: Profile['status'];
}

/**
 * A hook to subscribe to and update interpreter status changes
 */
export const useRealtimeStatus = ({
  interpreterId,
  onStatusChange,
  initialStatus = 'available'
}: UseRealtimeStatusOptions = {}) => {
  const [status, setStatus] = useState<Profile['status']>(initialStatus);
  const [isConnected, setIsConnected] = useState(true);
  
  // Initialize the realtime service once
  useEffect(() => {
    const cleanup = realtimeService.init();
    return cleanup;
  }, []);
  
  // Handle connection status changes
  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    };
  }, []);
  
  // Subscribe to status events for a specific interpreter
  useEffect(() => {
    if (!interpreterId) return;
    
    const handleStatusUpdate = ({ interpreterId: eventInterpreterId, status: newStatus }: { interpreterId: string, status: string }) => {
      if (eventInterpreterId === interpreterId) {
        setStatus(newStatus as Profile['status']);
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
  
  /**
   * Update an interpreter's status
   */
  const updateStatus = async (newStatus: Profile['status']): Promise<boolean> => {
    if (!interpreterId) return false;
    
    try {
      // Optimistically update the local state
      setStatus(newStatus);
      
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: newStatus
      });
      
      if (error) {
        console.error('Error updating status:', error);
        // Revert on error
        setStatus(status);
        return false;
      }
      
      // Broadcast status change for other components 
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status: newStatus
      });
      
      return true;
    } catch (error) {
      console.error('Unexpected error:', error);
      // Revert on error
      setStatus(status);
      return false;
    }
  };
  
  return {
    status,
    updateStatus,
    isConnected
  };
};
