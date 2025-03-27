
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
      if (eventInterpreterId === interpreterId) {
        console.log(`[useRealtimeStatus] 🔄 Received status update for ${interpreterId}: ${newStatus}`);
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
    
    // Initial fetch of status - this is critical to ensure we have the correct starting state
    console.log(`[useRealtimeStatus] 🚀 Initial load for ${interpreterId}`);
    
    // Fetch current status
    supabase
      .from('interpreter_profiles')
      .select('status')
      .eq('id', interpreterId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          const fetchedStatus = data.status as Profile['status'];
          console.log(`[useRealtimeStatus] ✅ Initial status fetch for ${interpreterId}: ${fetchedStatus}`);
          
          if (fetchedStatus !== status) {
            console.log(`[useRealtimeStatus] 🔄 Status update needed from ${status} to ${fetchedStatus}`);
            setStatus(fetchedStatus);
            setLastUpdateTime(new Date());
            
            if (onStatusChange) {
              onStatusChange(fetchedStatus);
            }
          }
        } else {
          console.error(`[useRealtimeStatus] ❌ Error fetching initial status:`, error);
        }
      });
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
      // No explicit cleanup needed for subscribeToInterpreterStatus
    };
  }, [interpreterId, onStatusChange, status]);
  
  // Refresh status when connected
  useEffect(() => {
    if (!interpreterId) return;
    
    if (isConnected) {
      console.log(`[useRealtimeStatus] 🔍 Checking latest status for ${interpreterId}`);
      
      // Fetch the current status directly
      supabase
        .from('interpreter_profiles')
        .select('status')
        .eq('id', interpreterId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            const fetchedStatus = data.status as Profile['status'];
            console.log(`[useRealtimeStatus] 📊 Status refresh for ${interpreterId}: ${fetchedStatus} (current: ${status})`);
            
            if (fetchedStatus !== status) {
              console.log(`[useRealtimeStatus] 🔄 Updating status: ${status} → ${fetchedStatus}`);
              setStatus(fetchedStatus);
              setLastUpdateTime(new Date());
              
              // Broadcast the status update to ensure all components are in sync
              eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
                interpreterId,
                status: fetchedStatus
              });
              
              if (onStatusChange) {
                onStatusChange(fetchedStatus);
              }
            }
          } else {
            console.error('[useRealtimeStatus] Error fetching status:', error);
          }
        });
    }
  }, [interpreterId, isConnected, onStatusChange, status]);
  
  /**
   * Update an interpreter's status
   */
  const updateStatus = useCallback(async (newStatus: Profile['status']): Promise<boolean> => {
    if (!interpreterId) return false;
    
    try {
      // Optimistically update the local state
      setStatus(newStatus);
      const now = Date.now();
      
      // Broadcast status change immediately for other components 
      console.log(`[useRealtimeStatus] 📡 Broadcasting status update for ${interpreterId}: ${newStatus}`);
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status: newStatus
      });
      
      // If not connected, store the pending update
      if (!isConnected) {
        pendingUpdateRef.current = { status: newStatus, timestamp: now };
        console.log(`[useRealtimeStatus] 📶 Connection down, storing pending update: ${newStatus}`);
        return false;
      }
      
      console.log(`[useRealtimeStatus] 📝 Saving status to database: ${interpreterId} → ${newStatus}`);
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: newStatus
      });
      
      if (error) {
        console.error('[useRealtimeStatus] ❌ Error updating status:', error);
        // Don't revert on error - optimistic update is shown
        // Will be fixed when next realtime update comes in
        return false;
      }
      
      // Update last update time
      setLastUpdateTime(new Date());
      console.log(`[useRealtimeStatus] ✅ Status successfully updated: ${interpreterId} → ${newStatus}`);
      
      return true;
    } catch (error) {
      console.error('[useRealtimeStatus] ❌ Unexpected error:', error);
      // Don't revert on error - optimistic update is shown
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
