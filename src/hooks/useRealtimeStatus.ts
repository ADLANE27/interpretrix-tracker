
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
  const directSubscriptionRef = useRef<() => void | null>(null);
  
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
    console.log(`[useRealtimeStatus] Connection status changed: ${connected}`);
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
        console.log(`[useRealtimeStatus] Connection restored, retrying pending update to ${pendingStatus}`);
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
      console.log(`[useRealtimeStatus] Received status update for ${interpreterId}: ${data.status}`);
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
      console.log('[useRealtimeStatus] Initializing realtime service');
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
    
    console.log(`[useRealtimeStatus] Setting up status listener for ${interpreterId}`);
    
    // Subscribe to status update events
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    
    // Subscribe to real-time database updates
    const realtimeCleanup = realtimeService.subscribeToInterpreterStatus(interpreterId);
    
    // Create a direct Supabase subscription as a fallback/redundancy
    if (!directSubscriptionRef.current) {
      const channel = supabase.channel(`direct-interpreter-status-${interpreterId}`)
        .on('postgres_changes', 
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interpreter_profiles',
          filter: `id=eq.${interpreterId}`
        }, 
        (payload) => {
          if (payload.new && payload.old && payload.new.status !== payload.old.status) {
            console.log(`[useRealtimeStatus] Direct subscription detected status change for ${interpreterId}: ${payload.new.status}`);
            const newStatus = payload.new.status as Profile['status'];
            
            if (newStatus !== statusRef.current) {
              setStatus(newStatus);
              statusRef.current = newStatus;
              setLastUpdateTime(new Date());
              
              if (onStatusChangeRef.current) {
                onStatusChangeRef.current(newStatus);
              }
              
              // Also emit the event to ensure all components stay in sync
              eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
                interpreterId,
                status: newStatus,
                timestamp: Date.now(),
                uuid: `direct-${Date.now()}`
              });
            }
          }
        })
        .subscribe((status) => {
          console.log(`[useRealtimeStatus] Direct subscription status for ${interpreterId}: ${status}`);
        });
      
      directSubscriptionRef.current = () => {
        supabase.removeChannel(channel);
      };
    }
    
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
      console.log(`[useRealtimeStatus] Cleaning up status listener for ${interpreterId}`);
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
      realtimeCleanup();
      
      if (directSubscriptionRef.current) {
        directSubscriptionRef.current();
        directSubscriptionRef.current = null;
      }
    };
  }, [interpreterId, handleStatusUpdate]);
  
  // Update status function
  const updateStatus = useCallback(async (newStatus: Profile['status']): Promise<boolean> => {
    if (!interpreterId) return false;
    
    try {
      console.log(`[useRealtimeStatus] Updating status to ${newStatus} for ${interpreterId}`);
      
      // Optimistically update UI immediately
      setStatus(newStatus);
      statusRef.current = newStatus;
      setLastUpdateTime(new Date());
      
      // Broadcast status change immediately for other components
      realtimeService.broadcastStatusUpdate(interpreterId, newStatus);
      
      // If not connected, store the pending update
      if (!isConnected) {
        pendingUpdateRef.current = { status: newStatus, timestamp: Date.now() };
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
      
      // Immediately after successful update, emit another event to ensure UI consistency
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status: newStatus,
        timestamp: Date.now(),
        uuid: `update-confirmation-${Date.now()}`
      });
      
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
