
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
  resetTimeout: 10000, // Reduced to 10s (from 20s) for faster recovery
  failureThreshold: 5
};

export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: any) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  const {
    enabled = true,
    retryInterval = 2000, // Reduced from 3000ms to 2000ms for faster recovery
    maxRetries = 5, // Increased from 3 to 5 for more resilience
    onError,
    debugMode = false,
    enableRealtimeConfig = true
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const seenEvents = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReconnectAttemptRef = useRef<number>(0);
  const reconnectMinIntervalMs = 500; // Prevent too frequent reconnection attempts

  const log = useCallback((message: string, ...args: any[]) => {
    if (debugMode) {
      console.log(`[Realtime ${instanceIdRef.current}] ${message}`, ...args);
    }
  }, [debugMode]);

  const logError = useCallback((message: string, ...args: any[]) => {
    console.error(`[Realtime ${instanceIdRef.current}] ${message}`, ...args);
  }, []);

  const resetCircuitBreaker = useCallback(() => {
    if (circuitBreakerState.isOpen) {
      log(`Manually resetting circuit breaker for ${config.table}`);
      circuitBreakerState.isOpen = false;
      circuitBreakerState.failureCount = 0;
    }
  }, [config.table, log]);

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
        log(`Circuit breaker is open, skipping enablement request. Will retry after ${Math.round((circuitBreakerState.resetTimeout - timeSinceLastFailure)/1000)}s`);
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
      
      // Add to global cache preemptively to prevent duplicate calls
      // This helps during quick retries even if the API call is still in progress
      enabledTablesCache.add(tableName);
      
      const { data, error } = await supabase.functions.invoke('enable-realtime', {
        body: { table: tableName }
      });
      
      if (error) {
        logError(`Error enabling realtime for table ${tableName}:`, error);
        
        // Only remove from cache if the error is not a "already enabled" error
        if (!error.message?.includes('already enabled')) {
          enabledTablesCache.delete(tableName);
          
          // Update circuit breaker on failure
          circuitBreakerState.failureCount++;
          circuitBreakerState.lastFailureTime = Date.now();
          
          if (circuitBreakerState.failureCount >= circuitBreakerState.failureThreshold) {
            circuitBreakerState.isOpen = true;
            logError(`Circuit breaker opened after ${circuitBreakerState.failureCount} failures`);
          }
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
      
      // Remove from cache on error
      enabledTablesCache.delete(tableName);
      
      return false;
    }
  }, [enableRealtimeConfig, shouldTryEnableRealtime, log, logError]);

  // Function to clear timeout
  const clearSetupTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Enhanced function to remove channel with proper error handling
  const safeRemoveChannel = useCallback(async (channel: RealtimeChannel | null) => {
    if (!channel) return;
    
    try {
      log('Removing existing channel');
      await supabase.removeChannel(channel);
    } catch (error) {
      logError('Error removing channel:', error);
      // Continue despite errors - we still want to create a new channel
    }
  }, [log, logError]);

  useEffect(() => {
    if (!enabled) return;
    
    // Try to manually reset circuit breaker on each mount
    // This helps to recover more quickly after page reloads
    resetCircuitBreaker();
    
    let mounted = true;

    const setupChannel = async () => {
      if (!mounted || !enabled) return;
      
      try {
        // Remove any existing channel
        if (channelRef.current) {
          await safeRemoveChannel(channelRef.current);
          channelRef.current = null;
        }

        // Try to enable realtime for this table
        await enableRealtimeForTable(config.table);

        const channelName = `${config.table}-${config.event}${config.filter ? '-filtered' : ''}-${instanceIdRef.current}`;
        log(`Setting up new channel with name: ${channelName}`);
        
        const channel = supabase.channel(channelName);
        
        // Create subscription config without filters that use 'eq.' format
        const subscriptionConfig: any = { 
          event: config.event, 
          schema: config.schema || 'public', 
          table: config.table
        };
        
        // Only add filter if it doesn't use the 'eq.' format which can be problematic
        if (config.filter && !config.filter.includes('eq.')) {
          subscriptionConfig.filter = config.filter;
          log(`Using filter: ${config.filter}`);
        } else if (config.filter) {
          log(`Skipping filter "${config.filter}" as it uses eq. format which is not reliable`);
        }
        
        channel.on(
          'postgres_changes' as any, 
          subscriptionConfig, 
          (payload: RealtimePostgresChangesPayload<any>) => {
            if (!mounted) return;
            
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
            
            log(`Received ${payload.eventType} event for ${config.table}:`, payload);
            callback(payload);
          }
        );

        channelRef.current = channel.subscribe((status) => {
          if (!mounted) return;
          
          log(`Subscription status for ${config.table}: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            retryCountRef.current = 0;
            log(`Successfully subscribed to ${config.table}`);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            
            if (retryCountRef.current < maxRetries) {
              const currentRetry = retryCountRef.current + 1;
              // Use exponential backoff for more intelligent retries
              const delayMs = retryInterval * Math.pow(1.5, currentRetry - 1);
              log(`Attempting reconnection (${currentRetry}/${maxRetries}) for ${config.table} in ${delayMs}ms`);
              retryCountRef.current = currentRetry;
              
              clearSetupTimeout();
              timeoutRef.current = setTimeout(() => {
                if (mounted) setupChannel();
              }, delayMs);
            } else {
              logError(`Max retries reached for ${config.table}`);
              onError?.({
                message: `Failed to establish realtime connection for ${config.table} after ${maxRetries} attempts`
              });
            }
          }
        });

      } catch (error) {
        if (!mounted) return;
        
        logError(`Error setting up channel for ${config.table}:`, error);
        onError?.(error);
        
        if (retryCountRef.current < maxRetries) {
          const currentRetry = retryCountRef.current + 1;
          const delayMs = retryInterval * Math.pow(1.5, currentRetry - 1);
          log(`Attempting reconnection after error (${currentRetry}/${maxRetries}) for ${config.table} in ${delayMs}ms`);
          retryCountRef.current = currentRetry;
          
          clearSetupTimeout();
          timeoutRef.current = setTimeout(() => {
            if (mounted) setupChannel();
          }, delayMs);
        }
      }
    };

    setupChannel();

    return () => {
      mounted = false;
      clearSetupTimeout();
      
      if (channelRef.current) {
        safeRemoveChannel(channelRef.current);
        channelRef.current = null;
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
    logError,
    clearSetupTimeout,
    resetCircuitBreaker,
    safeRemoveChannel
  ]);

  // Allow manual reconnection from outside
  const reconnect = useCallback(() => {
    const now = Date.now();
    
    // Prevent reconnection attempts that are too frequent
    if (now - lastReconnectAttemptRef.current < reconnectMinIntervalMs) {
      log(`Reconnection attempt throttled. Try again in ${reconnectMinIntervalMs}ms`);
      return;
    }
    
    lastReconnectAttemptRef.current = now;
    log(`Manual reconnection triggered for ${config.table}`);
    retryCountRef.current = 0;
    resetCircuitBreaker();
    
    // Force remove and recreate channel
    if (channelRef.current) {
      safeRemoveChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Set up the channel again
    const setupChannel = async () => {
      try {
        await enableRealtimeForTable(config.table);
        
        const channelName = `${config.table}-${config.event}${config.filter ? '-filtered' : ''}-${instanceIdRef.current}-manual`;
        log(`Setting up new channel manually with name: ${channelName}`);
        
        const channel = supabase.channel(channelName);
        
        // Create subscription config
        const subscriptionConfig: any = { 
          event: config.event, 
          schema: config.schema || 'public', 
          table: config.table
        };
        
        if (config.filter && !config.filter.includes('eq.')) {
          subscriptionConfig.filter = config.filter;
        }
        
        channel.on(
          'postgres_changes' as any, 
          subscriptionConfig, 
          (payload: RealtimePostgresChangesPayload<any>) => {
            log(`Received ${payload.eventType} event on manual channel:`, payload);
            callback(payload);
          }
        );
        
        channelRef.current = channel.subscribe((status) => {
          log(`Manual channel subscription status: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            log('Successfully subscribed to manual channel');
          }
        });
      } catch (error) {
        logError(`Error in manual reconnect for ${config.table}:`, error);
      }
    };
    
    setupChannel();
  }, [
    config.table, 
    config.event, 
    config.schema, 
    config.filter, 
    callback, 
    enableRealtimeForTable, 
    log, 
    logError, 
    resetCircuitBreaker,
    safeRemoveChannel
  ]);

  return { isConnected, reconnect };
}
