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

const globalStatusCache = new Map<string, {status: Profile['status'], timestamp: number}>();

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
  const connectionStateLoggedRef = useRef(false);
  const instanceIdRef = useRef<string>(`instance-${Math.random().toString(36).substring(2, 9)}`);
  const lastStatusRefreshRef = useRef<number>(0);
  
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  
  useEffect(() => {
    const cleanup = realtimeService.init();
    return cleanup;
  }, []);
  
  useEffect(() => {
    let lastKnownState = true;
    
    const handleConnectionChange = (connected: boolean) => {
      if (connected !== lastKnownState) {
        lastKnownState = connected;
        
        if (!connectionStateLoggedRef.current || connected !== isConnected) {
          console.log(`[useRealtimeStatus] Connection status changed: ${connected}`);
          connectionStateLoggedRef.current = true;
          setIsConnected(connected);
          
          if (onConnectionStateChange) {
            onConnectionStateChange(connected);
          }
        }
        
        if (connected && pendingUpdateRef.current && interpreterId) {
          const { status: pendingStatus, timestamp } = pendingUpdateRef.current;
          const now = Date.now();
          
          if (now - timestamp < 300000) {
            console.log(`[useRealtimeStatus] Connection restored, retrying pending update to ${pendingStatus}`);
            updateStatus(pendingStatus).then(() => {
              pendingUpdateRef.current = null;
            });
          } else {
            pendingUpdateRef.current = null;
          }
        }
      }
    };
    
    const handlerKey = interpreterId ? `connection-${interpreterId}-${instanceIdRef.current}` : `connection-default-${instanceIdRef.current}`;
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange, handlerKey);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange, handlerKey);
    };
  }, [onConnectionStateChange, interpreterId, isConnected]);
  
  useEffect(() => {
    if (!interpreterId) return;
    
    const handleStatusUpdate = ({ interpreterId: eventInterpreterId, status: newStatus }: { interpreterId: string, status: string }) => {
      if (eventInterpreterId === interpreterId && newStatus !== statusRef.current) {
        console.log(`[useRealtimeStatus] Received status update for ${interpreterId}: ${newStatus}`);
        setStatus(newStatus as Profile['status']);
        setLastUpdateTime(new Date());
        
        globalStatusCache.set(interpreterId, {
          status: newStatus as Profile['status'],
          timestamp: Date.now()
        });
        
        if (onStatusChange) {
          onStatusChange(newStatus as Profile['status']);
        }
      }
    };
    
    const handlerKey = `status-${interpreterId}-${instanceIdRef.current}`;
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate, handlerKey);
    
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      
      const cachedData = globalStatusCache.get(interpreterId);
      const now = Date.now();
      
      if (cachedData && now - cachedData.timestamp < 60000) {
        if (cachedData.status !== statusRef.current) {
          console.log(`[useRealtimeStatus] Using cached status for ${interpreterId}: ${cachedData.status}`);
          setStatus(cachedData.status);
          setLastUpdateTime(new Date(cachedData.timestamp));
          
          if (onStatusChange) {
            onStatusChange(cachedData.status);
          }
        }
      } else {
        supabase
          .from('interpreter_profiles')
          .select('status')
          .eq('id', interpreterId)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              const fetchedStatus = data.status as Profile['status'];
              console.log(`[useRealtimeStatus] Initial status fetch for ${interpreterId}: ${fetchedStatus}`);
              
              globalStatusCache.set(interpreterId, {
                status: fetchedStatus,
                timestamp: now
              });
              
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
    }
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate, handlerKey);
    };
  }, [interpreterId, onStatusChange]);
  
  useEffect(() => {
    if (!interpreterId) return;
    if (!isConnected) return;
    
    const now = Date.now();
    if (now - lastStatusRefreshRef.current < 60000) {
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
          
          globalStatusCache.set(interpreterId, {
            status: fetchedStatus,
            timestamp: Date.now()
          });
          
          if (fetchedStatus !== statusRef.current) {
            console.log(`[useRealtimeStatus] Status refresh for ${interpreterId}: ${fetchedStatus}`);
            setStatus(fetchedStatus);
            setLastUpdateTime(new Date());
            
            if (onStatusChange) {
              onStatusChange(fetchedStatus);
            }
            
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
  }, [interpreterId, isConnected, onStatusChange]);
  
  const updateStatus = useCallback(async (newStatus: Profile['status']): Promise<boolean> => {
    if (!interpreterId) return false;
    
    try {
      setStatus(newStatus);
      statusRef.current = newStatus;
      const now = Date.now();
      
      globalStatusCache.set(interpreterId, {
        status: newStatus,
        timestamp: now
      });
      
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status: newStatus
      });
      
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

setInterval(() => {
  const now = Date.now();
  globalStatusCache.forEach((value, key) => {
    if (now - value.timestamp > 300000) {
      globalStatusCache.delete(key);
    }
  });
}, 300000);
