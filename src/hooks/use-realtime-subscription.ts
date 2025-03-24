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

// Cache to deduplicate events across subscriptions
const eventCache = new Map<string, { 
  timestamp: number, 
  payload: RealtimePostgresChangesPayload<any>
}>();

// Cache timeout for deduplication (1 second)
const EVENT_CACHE_TIMEOUT = 1000;

// Clean the event cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of eventCache.entries()) {
    if (now - entry.timestamp > EVENT_CACHE_TIMEOUT) {
      eventCache.delete(key);
    }
  }
}, 5000); // Clean every 5 seconds

export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: any) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  const {
    enabled = true,
    retryInterval = 5000,
    maxRetries = 3,
    onError,
    debugMode = false,
    enableRealtimeConfig = true
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  
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

        const channelName = `${config.table}-${config.event}${config.filter ? '-filtered' : ''}-${instanceIdRef.current}`;
        log(`Setting up new channel with name: ${channelName}`);
        
        const channel = supabase.channel(channelName);
        
        // Parse the filter string into the format expected by Supabase
        const parsedFilter = config.filter ? parseFilter(config.filter) : undefined;
        
        channel.on(
          'postgres_changes', 
          { 
            event: config.event, 
            schema: config.schema || 'public', 
            table: config.table, 
            ...parsedFilter
          } as any, // Use type assertion to bypass strict type checking
          (payload: RealtimePostgresChangesPayload<any>) => {
            // Generate a unique event ID
            const eventId = generateEventId(payload);
            
            // Check for duplicate events
            if (isRecentDuplicate(eventId, payload)) {
              log(`Skipping duplicate event: ${eventId}`);
              return;
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
              onError?.({
                message: `Failed to establish realtime connection for ${config.table} after ${maxRetries} attempts`
              });
            }
          }
        });

      } catch (error) {
        logError(`Error setting up channel for ${config.table}:`, error);
        onError?.(error);
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

  // Helper function to convert filter string into Supabase format
  const parseFilter = (filterStr: string): Record<string, unknown> | undefined => {
    try {
      // Handle common filter formats
      if (filterStr.includes('=eq.')) {
        // Format: column=eq.value,column2=eq.value2
        const parts = filterStr.split(',');
        const filter: Record<string, unknown> = {};
        
        for (const part of parts) {
          const [columnWithOp, value] = part.split('=eq.');
          if (columnWithOp && value) {
            filter[columnWithOp] = value;
          }
        }
        
        return { filter };
      }
      
      // For more complex filters, just return undefined and let Supabase handle it
      return undefined;
    } catch (error) {
      logError(`Error parsing filter string: ${filterStr}`, error);
      return undefined;
    }
  };

  // Generate a unique ID for an event to detect duplicates
  const generateEventId = (payload: RealtimePostgresChangesPayload<any>): string => {
    const id = payload.eventType === 'DELETE' ? 
      (payload.old as any)?.id : 
      (payload.new as any)?.id;
    
    return `${payload.schema}-${payload.table}-${payload.eventType}-${id || 'unknown'}-${payload.commit_timestamp}`;
  };

  // Check if this event was recently processed
  const isRecentDuplicate = (eventId: string, payload: RealtimePostgresChangesPayload<any>): boolean => {
    const now = Date.now();
    
    if (eventCache.has(eventId)) {
      return true;
    }
    
    // Store this event in the cache
    eventCache.set(eventId, { timestamp: now, payload });
    
    // Ensure the cache doesn't grow too large
    if (eventCache.size > 100) {
      // Remove oldest entries
      const sortedEntries = [...eventCache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Keep only the 50 most recent entries
      const toRemove = sortedEntries.slice(0, sortedEntries.length - 50);
      for (const [key] of toRemove) {
        eventCache.delete(key);
      }
    }
    
    return false;
  };

  return { isConnected };
}
