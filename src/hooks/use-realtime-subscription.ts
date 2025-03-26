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
  resetTimeout: 60000, // 1 minute before trying again
  failureThreshold: 3
};

// Determine if we're in production mode based on URL or environment
const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1' &&
         !window.location.hostname.includes('preview');
};

export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: any) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  const {
    enabled = true,
    retryInterval = 5000,
    maxRetries = isProduction() ? 10 : 3, // Increased retries in production
    onError,
    debugMode = isProduction() ? false : true, // Disable debug mode in production
    enableRealtimeConfig = true
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const seenEvents = useRef<Set<string>>(new Set());

  const log = useCallback((message: string, ...args: any[]) => {
    if (debugMode) {
      console.log(`[Realtime ${instanceIdRef.current}] ${message}`, ...args);
    }
  }, [debugMode]);

  const logError = useCallback((message: string, ...args: any[]) => {
    // Only log detailed errors in debug mode
    if (debugMode) {
      console.error(`[Realtime ${instanceIdRef.current}] ${message}`, ...args);
    } else {
      // In production, log a simplified error message without the stack trace
      console.error(`[Realtime] Error with ${config.table} subscription: ${message}`);
    }
  }, [debugMode, config.table]);

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
        log(`Circuit breaker is open, skipping enablement request`);
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
        
        return false;
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
      
      return false;
    }
  }, [enableRealtimeConfig, shouldTryEnableRealtime, log, logError]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const setupChannel = async () => {
      if (!enabled) return;

      try {
        if (channelRef.current) {
          log('Removing existing channel');
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Try to enable realtime for this table, but proceed with subscription even if it fails
        // This allows reconnection attempts even if the realtime enablement failed
        await enableRealtimeForTable(config.table);

        // Use a more stable channel name in production to avoid creating too many channels
        const channelName = isProduction() 
          ? `${config.table}-${config.event}${config.filter ? '-filtered' : ''}`
          : `${config.table}-${config.event}${config.filter ? '-filtered' : ''}-${instanceIdRef.current}`;
        
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
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            
            if (retryCountRef.current < maxRetries) {
              const currentRetry = retryCountRef.current + 1;
              const delayMs = retryInterval * Math.pow(1.5, currentRetry - 1);
              log(`Attempting reconnection (${currentRetry}/${maxRetries}) for ${config.table} in ${delayMs}ms`);
              retryCountRef.current = currentRetry;
              timeoutId = setTimeout(setupChannel, delayMs);
            } else {
              logError(`Max retries reached for ${config.table}`);
              if (onError) {
                onError({
                  message: `Failed to establish realtime connection for ${config.table} after ${maxRetries} attempts`
                });
              }
            }
          }
        });

      } catch (error) {
        logError(`Error setting up channel for ${config.table}:`, error);
        if (onError) onError(error);
      }
    };

    setupChannel();

    return () => {
      log(`Cleaning up subscription for ${config.table}`);
      clearTimeout(timeoutId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
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

  return { isConnected };
}
