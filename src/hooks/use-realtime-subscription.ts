
import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
}

interface UseRealtimeSubscriptionOptions {
  enabled?: boolean;
  retryInterval?: number;
  maxRetries?: number;
  onError?: (error: any) => void;
  debugMode?: boolean;
  enableRealtimeConfig?: boolean;
}

// Global cache to track which tables have had realtime enabled
const enabledTablesCache = new Set<string>();
// Circuit breaker state to prevent repeated failed calls
const circuitBreakerState = {
  isOpen: false,
  failureCount: 0,
  lastFailureTime: 0,
  // Reduced from 60000 (1 minute) to 10000 (10 seconds)
  resetTimeout: 10000,
  failureThreshold: 3
};

export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: any) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  const {
    enabled = true,
    retryInterval = 2000, // Reduced from 5000 to 2000
    maxRetries = 5, // Increased from 3 to 5
    onError,
    debugMode = false,
    enableRealtimeConfig = true
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const seenEvents = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const log = useCallback((message: string, ...args: any[]) => {
    if (debugMode) {
      console.log(`[Realtime ${instanceIdRef.current}] ${message}`, ...args);
    }
  }, [debugMode]);

  const logError = useCallback((message: string, ...args: any[]) => {
    console.error(`[Realtime ${instanceIdRef.current}] ${message}`, ...args);
  }, []);

  const shouldTryEnableRealtime = useCallback((tableName: string) => {
    // If cache shows this table is already enabled, skip
    if (enabledTablesCache.has(tableName)) {
      log(`Table ${tableName} is already cached as enabled, skipping enablement`);
      return false;
    }
    
    // Check circuit breaker state
    if (circuitBreakerState.isOpen) {
      const now = Date.now();
      const timeSinceLastFailure = now - circuitBreakerState.lastFailureTime;
      
      // If enough time has passed, reset the circuit breaker
      if (timeSinceLastFailure > circuitBreakerState.resetTimeout) {
        log(`Circuit breaker reset after ${timeSinceLastFailure}ms`);
        circuitBreakerState.isOpen = false;
        circuitBreakerState.failureCount = 0;
      } else {
        log(`Circuit breaker is open (${Math.floor((circuitBreakerState.resetTimeout - timeSinceLastFailure) / 1000)}s remaining), skipping enablement request`);
        // Important: Continue with subscription even if circuit breaker is open
        return false;
      }
    }
    
    return true;
  }, [log]);

  const enableRealtimeForTable = useCallback(async (tableName: string) => {
    // Skip if disabled or if we shouldn't try
    if (!enableRealtimeConfig || !shouldTryEnableRealtime(tableName)) {
      return true; // Return true to continue with subscription setup
    }
    
    try {
      log(`Enabling realtime for table ${tableName}`);
      const { data, error } = await supabase.functions.invoke('enable-realtime', {
        body: { table: tableName }
      });
      
      if (error) {
        logError(`Error enabling realtime for table ${tableName}:`, error);
        
        // Update circuit breaker on failure
        circuitBreakerState.failureCount++;
        circuitBreakerState.lastFailureTime = Date.now();
        
        if (circuitBreakerState.failureCount >= circuitBreakerState.failureThreshold) {
          circuitBreakerState.isOpen = true;
          logError(`Circuit breaker opened after ${circuitBreakerState.failureCount} failures`);
        }
        
        // Important: Continue with subscription setup even if enablement fails
        return true;
      }
      
      log(`Successfully enabled realtime for table ${tableName}:`, data);
      
      // Add to global cache on success
      enabledTablesCache.add(tableName);
      
      // Reset circuit breaker on success
      circuitBreakerState.failureCount = 0;
      circuitBreakerState.isOpen = false;
      
      return true;
    } catch (error) {
      logError(`Error calling enable-realtime function for table ${tableName}:`, error);
      
      // Update circuit breaker on exception
      circuitBreakerState.failureCount++;
      circuitBreakerState.lastFailureTime = Date.now();
      
      if (circuitBreakerState.failureCount >= circuitBreakerState.failureThreshold) {
        circuitBreakerState.isOpen = true;
        logError(`Circuit breaker opened after ${circuitBreakerState.failureCount} failures`);
      }
      
      // Important: Continue with subscription setup even if an exception occurs
      return true;
    }
  }, [enableRealtimeConfig, shouldTryEnableRealtime, log, logError]);

  const setupChannel = useCallback(async () => {
    if (!enabled) return;

    try {
      if (channelRef.current) {
        log('Removing existing channel');
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Always proceed with subscription setup, even if enablement fails
      await enableRealtimeForTable(config.table);

      const channelName = `${config.table}-${config.event}${config.filter ? '-filtered' : ''}-${instanceIdRef.current}`;
      log(`Setting up new channel with name: ${channelName}`);
      
      const channel = supabase.channel(channelName);
      
      channel.on(
        'postgres_changes' as any, 
        { 
          event: config.event, 
          schema: config.schema || 'public', 
          table: config.table, 
          filter: config.filter 
        }, 
        (payload: RealtimePostgresChangesPayload<any>) => {
          const eventId = `${payload.eventType}-${
            payload.eventType === 'DELETE' ? 
            (payload.old as any)?.id : 
            (payload.new as any)?.id
          }-${payload.commit_timestamp}`;
          
          if (seenEvents.current.has(eventId)) {
            log(`Skipping duplicate event: ${eventId}`);
            return;
          }
          
          seenEvents.current.add(eventId);
          
          if (seenEvents.current.size > 100) {
            const eventsArray = Array.from(seenEvents.current);
            seenEvents.current = new Set(eventsArray.slice(-50));
          }
          
          log(`Received ${config.event} event for ${config.table}:`, payload);
          callback(payload);
        }
      );

      channelRef.current = channel.subscribe((status) => {
        log(`Subscription status for ${config.table}: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          retryCountRef.current = 0;
          // Clear any pending reconnection attempts
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = undefined;
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          
          if (retryCountRef.current < maxRetries) {
            const currentRetry = retryCountRef.current + 1;
            const delayMs = retryInterval * Math.pow(1.5, currentRetry - 1);
            log(`Attempting reconnection (${currentRetry}/${maxRetries}) for ${config.table} in ${delayMs}ms`);
            retryCountRef.current = currentRetry;
            
            // Clear any existing timeout
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              setupChannel();
            }, delayMs);
          } else {
            logError(`Max retries reached for ${config.table}`);
            // Call onError but continue attempting to reconnect
            if (onError) {
              onError({
                message: `Failed to establish realtime connection for ${config.table} after ${maxRetries} attempts`
              });
            }
            
            // Reset retry count and try again after a longer delay
            retryCountRef.current = 0;
            reconnectTimeoutRef.current = setTimeout(() => {
              log(`Trying again after max retries for ${config.table}`);
              setupChannel();
            }, retryInterval * 3);
          }
        }
      });

    } catch (error) {
      logError(`Error setting up channel for ${config.table}:`, error);
      if (onError) onError(error);
      
      // Try again after error
      reconnectTimeoutRef.current = setTimeout(() => {
        log(`Retrying after setup error for ${config.table}`);
        setupChannel();
      }, retryInterval);
    }
  }, [
    enabled, 
    config.table, 
    config.event, 
    config.schema, 
    config.filter, 
    callback, 
    maxRetries, 
    retryInterval, 
    onError, 
    enableRealtimeForTable,
    log,
    logError
  ]);

  useEffect(() => {
    setupChannel();

    return () => {
      log(`Cleaning up subscription for ${config.table}`);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [
    setupChannel,
    config.table,
    log
  ]);

  return { isConnected };
}
