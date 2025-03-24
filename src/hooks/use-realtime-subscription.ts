
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
}

// Global table registry to avoid duplicate subscriptions
const activeSubscriptions = new Map<string, { count: number, tables: Set<string> }>();
// Circuit breaker state to prevent repeated failed calls
const circuitBreakerState = {
  isOpen: false,
  failureCount: 0,
  lastFailureTime: 0,
  resetTimeout: 30000, // 30 seconds before trying again
  failureThreshold: 3
};

// Reset circuit breaker state for fresh start
export const resetCircuitBreaker = () => {
  circuitBreakerState.isOpen = false;
  circuitBreakerState.failureCount = 0;
  circuitBreakerState.lastFailureTime = 0;
  console.log('[CircuitBreaker] Reset successful');
};

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
    debugMode = false
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const seenEvents = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  const log = useCallback((message: string, ...args: any[]) => {
    if (debugMode) {
      console.log(`[Realtime ${instanceIdRef.current}] ${message}`, ...args);
    }
  }, [debugMode]);

  const logError = useCallback((message: string, ...args: any[]) => {
    console.error(`[Realtime ${instanceIdRef.current}] ${message}`, ...args);
  }, []);

  // Function to enable realtime for a table
  const enableRealtimeForTable = useCallback(async (tableName: string) => {
    // Skip if the circuit breaker is open
    if (circuitBreakerState.isOpen) {
      const now = Date.now();
      const timeSinceLastFailure = now - circuitBreakerState.lastFailureTime;
      
      if (timeSinceLastFailure > circuitBreakerState.resetTimeout) {
        log(`Circuit breaker reset after ${timeSinceLastFailure}ms`);
        circuitBreakerState.isOpen = false;
        circuitBreakerState.failureCount = 0;
      } else {
        log(`Circuit breaker is open, skipping enablement request`);
        return false;
      }
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
  }, [log, logError]);

  // Track subscription for this component instance
  useEffect(() => {
    const userId = instanceIdRef.current;
    const tableName = config.table;
    
    // Register this subscription
    if (!activeSubscriptions.has(userId)) {
      activeSubscriptions.set(userId, { count: 1, tables: new Set([tableName]) });
    } else {
      const userSubs = activeSubscriptions.get(userId)!;
      userSubs.count++;
      userSubs.tables.add(tableName);
    }
    
    log(`Registered subscription for ${tableName} (total: ${activeSubscriptions.get(userId)?.count})`);
    
    return () => {
      if (activeSubscriptions.has(userId)) {
        const userSubs = activeSubscriptions.get(userId)!;
        userSubs.count--;
        
        if (userSubs.count <= 0) {
          activeSubscriptions.delete(userId);
          log(`Removed all subscriptions for ${userId}`);
        } else {
          log(`Unregistered subscription for ${tableName} (remaining: ${userSubs.count})`);
        }
      }
    };
  }, [config.table, log]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    mountedRef.current = true;

    // Reset the circuit breaker on initial mount
    if (circuitBreakerState.isOpen) {
      resetCircuitBreaker();
    }

    const setupChannel = async () => {
      if (!enabled || !mountedRef.current) return;

      try {
        if (channelRef.current) {
          log('Removing existing channel');
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Try to enable realtime for this table
        const enablementResult = await enableRealtimeForTable(config.table);
        if (!enablementResult && retryCountRef.current < maxRetries) {
          const currentRetry = retryCountRef.current + 1;
          const delayMs = retryInterval * Math.pow(1.5, currentRetry - 1);
          
          log(`Table enablement failed, will retry (${currentRetry}/${maxRetries}) in ${delayMs}ms`);
          retryCountRef.current = currentRetry;
          
          if (mountedRef.current) {
            timeoutId = setTimeout(setupChannel, delayMs);
          }
          return;
        }

        const channelName = `${config.table}-${config.event}${config.filter ? '-filtered' : ''}-${instanceIdRef.current}`;
        log(`Setting up new channel with name: ${channelName}`);
        
        const channel = supabase.channel(channelName);
        
        channel.on(
          'postgres_changes', 
          { 
            event: config.event, 
            schema: config.schema || 'public', 
            table: config.table, 
            filter: config.filter 
          }, 
          (payload: RealtimePostgresChangesPayload<any>) => {
            if (!mountedRef.current) return;
            
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
          if (!mountedRef.current) return;
          
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
              
              if (mountedRef.current) {
                timeoutId = setTimeout(setupChannel, delayMs);
              }
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
      mountedRef.current = false;
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

  return { 
    isConnected,
    resetCircuitBreaker
  };
}
