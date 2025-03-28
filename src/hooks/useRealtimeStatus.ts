
import { useEffect, useState, useCallback, useRef } from 'react';
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
  const pendingUpdateRef = useRef<{status: Profile['status'], timestamp: number} | null>(null);
  const isInitialLoadRef = useRef(true);
  const statusRef = useRef<Profile['status']>(initialStatus);
  
  // Keep a ref to the latest status for comparison in event handlers
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  
  // Initialize the realtime service once
  useEffect(() => {
    const cleanup = realtimeService.init();
    return cleanup;
  }, []);
  
  // Handle connection status changes
  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      console.log(`[useRealtimeStatus] Connection status changed: ${connected}`);
      setIsConnected(connected);
      
      if (onConnectionStateChange) {
        onConnectionStateChange(connected);
      }
      
      if (connected && pendingUpdateRef.current && interpreterId) {
        // If connection restored and we have pending updates, retry them
        const { status: pendingStatus, timestamp } = pendingUpdateRef.current;
        const now = Date.now();
        
        // Only retry if pending update is recent (within last 2 minutes)
        if (now - timestamp < 120000) {
          console.log(`[useRealtimeStatus] Connection restored, retrying pending update to ${pendingStatus}`);
          updateStatus(pendingStatus).then(() => {
            pendingUpdateRef.current = null;
          });
        } else {
          pendingUpdateRef.current = null;
        }
      }
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    };
  }, [onConnectionStateChange, interpreterId]);
  
  // Subscribe to status events for a specific interpreter
  useEffect(() => {
    if (!interpreterId) return;
    
    const handleStatusUpdate = ({ interpreterId: eventInterpreterId, status: newStatus }: { interpreterId: string, status: string }) => {
      if (eventInterpreterId === interpreterId && newStatus !== statusRef.current) {
        console.log(`[useRealtimeStatus] Received status update for ${interpreterId}: ${newStatus}`);
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
    realtimeService.subscribeToInterpreterStatus(interpreterId);
    
    // Initial fetch of status
    if (isInitialLoadRef.current) {
      console.log(`[useRealtimeStatus] Initial load for ${interpreterId}`);
      isInitialLoadRef.current = false;
      
      // Fetch current status
      supabase
        .from('interpreter_profiles')
        .select('status')
        .eq('id', interpreterId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            const fetchedStatus = data.status as Profile['status'];
            console.log(`[useRealtimeStatus] Initial status fetch for ${interpreterId}: ${fetchedStatus}`);
            
            if (fetchedStatus !== statusRef.current) {
              setStatus(fetchedStatus);
              setLastUpdateTime(new Date());
              
              if (onStatusChange) {
                onStatusChange(fetchedStatus);
              }
            }
          }
        });
    }
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
      // No explicit cleanup needed for subscribeToInterpreterStatus
    };
  }, [interpreterId, onStatusChange]);
  
  // Refresh status if connection is restored
  useEffect(() => {
    if (!interpreterId) return;
    
    let timeoutId: NodeJS.Timeout;
    
    if (isConnected) {
      // If we're connected, refresh the status after a short delay
      timeoutId = setTimeout(async () => {
        try {
          // Fetch the current status directly
          const { data, error } = await supabase
            .from('interpreter_profiles')
            .select('status')
            .eq('id', interpreterId)
            .single();
          
          if (!error && data) {
            const fetchedStatus = data.status as Profile['status'];
            console.log(`[useRealtimeStatus] Status refresh for ${interpreterId}: ${fetchedStatus}`);
            
            if (fetchedStatus !== statusRef.current) {
              setStatus(fetchedStatus);
              setLastUpdateTime(new Date());
              
              if (onStatusChange) {
                onStatusChange(fetchedStatus);
              }
              
              // Force broadcast to sync all components
              eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
                interpreterId,
                status: fetchedStatus
              });
            }
          }
        } catch (error) {
          console.error('[useRealtimeStatus] Error fetching status:', error);
        }
      }, 200); // Short delay for faster updates
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [interpreterId, isConnected, onStatusChange]);
  
  /**
   * Update an interpreter's status
   */
  const updateStatus = useCallback(async (newStatus: Profile['status']): Promise<boolean> => {
    if (!interpreterId) return false;
    
    try {
      // Optimistically update the local state
      setStatus(newStatus);
      statusRef.current = newStatus;
      const now = Date.now();
      
      // Broadcast status change immediately for other components 
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status: newStatus
      });
      
      // If not connected, store the pending update
      if (!isConnected) {
        pendingUpdateRef.current = { status: newStatus, timestamp: now };
        console.log(`[useRealtimeStatus] Connection down, storing pending update: ${newStatus}`);
        return false;
      }
      
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: newStatus
      });
      
      if (error) {
        console.error('[useRealtimeStatus] Error updating status:', error);
        return false;
      }
      
      // Update last update time
      setLastUpdateTime(new Date());
      
      return true;
    } catch (error) {
      console.error('[useRealtimeStatus] Unexpected error:', error);
      return false;
    }
  }, [interpreterId, isConnected]);
  
  return {
    status,
    updateStatus,
    isConnected,
    lastUpdateTime
  };
};
