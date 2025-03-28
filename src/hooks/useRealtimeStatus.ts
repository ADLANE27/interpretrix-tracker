import { useEffect, useState, useCallback, useRef } from 'react';
import { realtimeService } from '@/services/realtime';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_CONNECTION_STATUS_CHANGE, onConnectionStatusChange } from '@/lib/events';
import { Profile } from '@/types/profile';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeStatusOptions {
  interpreterId?: string;
  onStatusChange?: (status: Profile['status']) => void;
  initialStatus?: Profile['status'];
  onConnectionStateChange?: (connected: boolean) => void;
}

// Global cache for status data to prevent redundant fetches
const globalStatusCache = new Map<string, {status: Profile['status'], timestamp: number}>();
// Track active fetches to prevent duplicate requests
const activeFetches = new Set<string>();
// Track instances to prevent duplicate initialization
const activeInstances = new Map<string, number>();

/**
 * A hook to subscribe to and update interpreter status changes
 */
export const useRealtimeStatus = ({
  interpreterId,
  onStatusChange,
  initialStatus = 'available',
  onConnectionStateChange
}: UseRealtimeStatusOptions = {}) => {
  // Skip initialization if no interpreter ID is provided
  if (!interpreterId) {
    return {
      status: initialStatus,
      updateStatus: async () => false,
      isConnected: true,
      lastUpdateTime: null
    };
  }
  
  // Check if we already have an active instance for this interpreter
  const instanceCount = activeInstances.get(interpreterId) || 0;
  activeInstances.set(interpreterId, instanceCount + 1);
  
  const instanceIdRef = useRef<string>(`instance-${Math.random().toString(36).substring(2, 9)}`);
  const [status, setStatus] = useState<Profile['status']>(initialStatus);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const pendingUpdateRef = useRef<{status: Profile['status'], timestamp: number} | null>(null);
  const statusRef = useRef<Profile['status']>(initialStatus);
  const connectionStateLoggedRef = useRef(false);
  const lastStatusRefreshRef = useRef<number>(0);
  const hasSetupStatusRef = useRef<boolean>(false);
  const onStatusChangeRef = useRef(onStatusChange);
  
  // Keep the callback ref updated
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);
  
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  
  // Initialize realtime service once
  useEffect(() => {
    const cleanup = realtimeService.init();
    return cleanup;
  }, []);
  
  // Handle connection status changes
  useEffect(() => {
    if (!interpreterId) return;
    
    const handleConnectionChange = (connected: boolean) => {
      if (connected !== isConnected) {
        if (!connectionStateLoggedRef.current || connected !== isConnected) {
          connectionStateLoggedRef.current = true;
          setIsConnected(connected);
          
          if (onConnectionStateChange) {
            onConnectionStateChange(connected);
          }
        }
        
        if (connected && pendingUpdateRef.current) {
          const { status: pendingStatus, timestamp } = pendingUpdateRef.current;
          const now = Date.now();
          
          if (now - timestamp < 300000) {
            updateStatus(pendingStatus).then(() => {
              pendingUpdateRef.current = null;
            });
          } else {
            pendingUpdateRef.current = null;
          }
        }
      }
    };
    
    // Use a stable connection handler with a unique key for this instance
    const handlerKey = `connection-${interpreterId}-${instanceIdRef.current}`;
    const cleanupConnection = onConnectionStatusChange(handleConnectionChange, handlerKey);
    
    return cleanupConnection;
  }, [interpreterId, isConnected, onConnectionStateChange]);
  
  // Subscribe to status updates
  useEffect(() => {
    if (!interpreterId) return;
    
    // Create a stable status update handler that references current state
    const handleStatusUpdate = ({ interpreterId: eventInterpreterId, status: newStatus }: { interpreterId: string, status: string }) => {
      if (eventInterpreterId === interpreterId && newStatus !== statusRef.current) {
        setStatus(newStatus as Profile['status']);
        setLastUpdateTime(new Date());
        
        globalStatusCache.set(interpreterId, {
          status: newStatus as Profile['status'],
          timestamp: Date.now()
        });
        
        if (onStatusChangeRef.current) {
          onStatusChangeRef.current(newStatus as Profile['status']);
        }
      }
    };
    
    // Register handler with a unique key for this instance
    const handlerKey = `status-${interpreterId}-${instanceIdRef.current}`;
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate, handlerKey);
    
    // Initial status setup with caching to prevent redundant fetches
    if (!hasSetupStatusRef.current) {
      hasSetupStatusRef.current = true;
      
      // Check cache first
      const cachedData = globalStatusCache.get(interpreterId);
      const now = Date.now();
      
      if (cachedData && now - cachedData.timestamp < 60000) {
        // Use cached data if recent enough
        if (cachedData.status !== statusRef.current) {
          setStatus(cachedData.status);
          setLastUpdateTime(new Date(cachedData.timestamp));
          
          if (onStatusChangeRef.current) {
            onStatusChangeRef.current(cachedData.status);
          }
        }
      } else if (!activeFetches.has(interpreterId)) {
        // Only fetch if not already in progress
        activeFetches.add(interpreterId);
        
        // Fetch status from database
        supabase
          .from('interpreter_profiles')
          .select('status')
          .eq('id', interpreterId)
          .single()
          .then(({ data, error }) => {
            activeFetches.delete(interpreterId);
            
            if (!error && data) {
              const fetchedStatus = data.status as Profile['status'];
              
              // Update global cache
              globalStatusCache.set(interpreterId, {
                status: fetchedStatus,
                timestamp: now
              });
              
              // Update state if changed
              if (fetchedStatus !== statusRef.current) {
                setStatus(fetchedStatus);
                setLastUpdateTime(new Date());
                
                if (onStatusChangeRef.current) {
                  onStatusChangeRef.current(fetchedStatus);
                }
              }
            }
          });
      }
    }
    
    // Cleanup
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate, handlerKey);
      
      // Decrement instance count
      const count = activeInstances.get(interpreterId) || 0;
      if (count > 1) {
        activeInstances.set(interpreterId, count - 1);
      } else {
        activeInstances.delete(interpreterId);
      }
    };
  }, [interpreterId]);
  
  // Periodic status refresh - highly throttled to minimize DB queries
  useEffect(() => {
    if (!interpreterId) return;
    if (!isConnected) return;
    
    // Only refresh every 60 seconds at most
    const now = Date.now();
    if (now - lastStatusRefreshRef.current < 60000) {
      return;
    }
    
    // Only do periodic refresh if this is the first/only instance for this interpreter
    const instanceCount = activeInstances.get(interpreterId) || 0;
    if (instanceCount > 1) {
      return;
    }
    
    lastStatusRefreshRef.current = now;
    
    const timeoutId = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('interpreter_profiles')
          .select('status')
          .eq('id', interpreterId)
          .single();
        
        if (!error && data) {
          const fetchedStatus = data.status as Profile['status'];
          
          // Update global cache
          globalStatusCache.set(interpreterId, {
            status: fetchedStatus,
            timestamp: Date.now()
          });
          
          // Update state and emit event if changed
          if (fetchedStatus !== statusRef.current) {
            setStatus(fetchedStatus);
            setLastUpdateTime(new Date());
            
            if (onStatusChangeRef.current) {
              onStatusChangeRef.current(fetchedStatus);
            }
            
            // Broadcast change
            eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
              interpreterId,
              status: fetchedStatus
            });
          }
        }
      } catch (error) {
        console.error('[useRealtimeStatus] Error fetching status:', error);
      }
    }, 3000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [interpreterId, isConnected]);
  
  // Stable updateStatus function
  const updateStatus = useCallback(async (newStatus: Profile['status']): Promise<boolean> => {
    if (!interpreterId) return false;
    
    try {
      // Update local state optimistically
      setStatus(newStatus);
      statusRef.current = newStatus;
      const now = Date.now();
      
      // Update cache
      globalStatusCache.set(interpreterId, {
        status: newStatus,
        timestamp: now
      });
      
      // Broadcast change
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status: newStatus
      });
      
      // Store pending update if offline
      if (!isConnected) {
        pendingUpdateRef.current = { status: newStatus, timestamp: now };
        return false;
      }
      
      // Send update to server
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: newStatus
      });
      
      if (error) {
        console.error('[useRealtimeStatus] Error updating status:', error);
        return false;
      }
      
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

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  globalStatusCache.forEach((value, key) => {
    if (now - value.timestamp > 300000) {
      globalStatusCache.delete(key);
    }
  });
}, 300000);
