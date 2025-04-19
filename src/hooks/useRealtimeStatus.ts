
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
  const onStatusChangeRef = useRef(onStatusChange);
  const onConnectionStateChangeRef = useRef(onConnectionStateChange);
  const lastEventIdRef = useRef<string | null>(null);
  
  // Update refs when props change
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);
  
  useEffect(() => {
    onConnectionStateChangeRef.current = onConnectionStateChange;
  }, [onConnectionStateChange]);
  
  // Handle connection status changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    
    if (onConnectionStateChangeRef.current) {
      onConnectionStateChangeRef.current(connected);
    }
    
    if (connected && pendingUpdateRef.current && interpreterId) {
      // If connection restored and we have pending updates, retry them
      const { status: pendingStatus, timestamp } = pendingUpdateRef.current;
      const now = Date.now();
      
      // Only retry if pending update is recent (within last 2 minutes)
      if (now - timestamp < 120000) {
        updateStatus(pendingStatus).then(() => {
          pendingUpdateRef.current = null;
        });
      } else {
        pendingUpdateRef.current = null;
      }
    }
  }, [interpreterId]);
  
  // Handle status update events
  const handleStatusUpdate = useCallback((data: { 
    interpreterId: string, 
    status: Profile['status'],
    timestamp?: number,
    uuid?: string
  }) => {
    if (!interpreterId || data.interpreterId !== interpreterId) return;
    
    // Prevent duplicate processing of the same event
    if (data.uuid && data.uuid === lastEventIdRef.current) {
      return;
    }
    
    // Update last event ID if provided
    if (data.uuid) {
      lastEventIdRef.current = data.uuid;
    }
    
    if (data.status !== statusRef.current) {
      setStatus(data.status);
      statusRef.current = data.status;
      setLastUpdateTime(new Date());
      
      if (onStatusChangeRef.current) {
        onStatusChangeRef.current(data.status);
      }
    }
  }, [interpreterId]);
  
  // Initialize the realtime service once
  useEffect(() => {
    // Check if already initialized
    const isInitialized = realtimeService.isInitialized();
    
    if (!isInitialized) {
      const cleanup = realtimeService.init();
      return cleanup;
    }
    return () => {};
  }, []);
  
  // Subscribe to connection status events
  useEffect(() => {
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    };
  }, [handleConnectionChange]);
  
  // Subscribe to status update events
  useEffect(() => {
    if (!interpreterId) return;
    
    // Subscribe to status update events
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    
    // Subscribe to real-time database updates
    const cleanup = realtimeService.subscribeToInterpreterStatus(interpreterId);
    
    // Initial fetch of status
    if (isInitialLoadRef.current) {
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
            
            if (fetchedStatus !== statusRef.current) {
              setStatus(fetchedStatus);
              statusRef.current = fetchedStatus;
              setLastUpdateTime(new Date());
              
              if (onStatusChangeRef.current) {
                onStatusChangeRef.current(fetchedStatus);
              }
            }
          }
        });
    }
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
      cleanup();
    };
  }, [interpreterId, handleStatusUpdate]);
  
  // Update status function
  const updateStatus = useCallback(async (newStatus: Profile['status']): Promise<boolean> => {
    if (!interpreterId) return false;
    
    try {
      // Optimistically update UI immediately
      setStatus(newStatus);
      statusRef.current = newStatus;
      setLastUpdateTime(new Date());
      
      // Broadcast status change immediately for other components
      realtimeService.broadcastStatusUpdate(interpreterId, newStatus);
      
      // If not connected, store the pending update
      if (!isConnected) {
        pendingUpdateRef.current = { status: newStatus, timestamp: Date.now() };
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
