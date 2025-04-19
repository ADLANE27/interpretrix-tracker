import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CONNECTION_CONSTANTS } from './supabase-connection/constants';

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

// Global cache to track which tables have had realtime enabled and active subscriptions
const enabledTablesCache = new Set<string>();
const activeSubscriptions = new Map<string, { count: number, channel: RealtimeChannel }>();

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

// Create a shared subscription for the same table/event combination
const getOrCreateSharedChannel = (
  channelName: string,
  config: SubscriptionConfig,
  callback: (payload: any) => void
): [RealtimeChannel, () => void] => {
  const key = `${config.table}-${config.event}${config.filter ? `-${config.filter}` : ''}`;
  
  // If we already have this subscription, reuse it
  if (activeSubscriptions.has(key)) {
    const existing = activeSubscriptions.get(key)!;
    existing.count++;
    return [existing.channel, () => {
      const current = activeSubscriptions.get(key);
      if (current) {
        current.count--;
        if (current.count <= 0) {
          supabase.removeChannel(current.channel);
          activeSubscriptions.delete(key);
        }
      }
    }];
  }
  
  // Create a new subscription
  const channel = supabase.channel(channelName);
  
  channel.on(
    'postgres_changes' as any, 
    { 
      event: config.event, 
      schema: config.schema || 'public', 
      table: config.table, 
      filter: config.filter 
    }, 
    callback
  );
  
  activeSubscriptions.set(key, { count: 1, channel });
  
  return [channel, () => {
    const current = activeSubscriptions.get(key);
    if (current) {
      current.count--;
      if (current.count <= 0) {
        supabase.removeChannel(current.channel);
        activeSubscriptions.delete(key);
      }
    }
  }];
};

export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: any) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  const {
    enabled = true,
    retryInterval = 5000,
    maxRetries = isProduction() ? 15 : 5, // Increased retries in production
    onError,
    debugMode = isProduction() ? false : true, // Disable debug mode in production
    enableRealtimeConfig = true
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const seenEvents = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback reference updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

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
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      // Set a timeout for the fetch request
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, CONNECTION_CONSTANTS.HEARTBEAT_TIMEOUT);

      const { data, error } = await supabase.functions.invoke('enable-realtime', {
        body: { table: tableName }
      });
      
      clearTimeout(timeoutId);
      
      if (signal.aborted) {
        logError(`Request to enable realtime for ${tableName} was aborted`);
        return false;
      }
      
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

  // Calculate exponential backoff with jitter
  const calculateBackoff = useCallback((attempt: number, baseDelay: number) => {
    // Apply exponential backoff with a cap
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(1.5, attempt), 
      CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS * 1000
    );
    
    // Add random jitter (±20%) to prevent all clients from reconnecting simultaneously
    const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
    
    return Math.floor(exponentialDelay + jitter);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    let mounted = true;

    const setupChannel = async () => {
      if (!enabled || !mounted) return;

      try {
        if (channelRef.current && cleanupRef.current) {
          log('Removing existing channel');
          cleanupRef.current();
          channelRef.current = null;
          cleanupRef.current = null;
        }

        // Try to enable realtime for this table
        await enableRealtimeForTable(config.table);

        // Use a more stable channel name in production to avoid creating too many channels
        const channelName = isProduction() 
          ? `${config.table}-${config.event}${config.filter ? '-filtered' : ''}`
          : `${config.table}-${config.event}${config.filter ? '-filtered' : ''}-${instanceIdRef.current}`;
        
        log(`Setting up new channel with name: ${channelName}`);
        
        const wrappedCallback = (payload: RealtimePostgresChangesPayload<any>) => {
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
          
          log(`Received ${config.event} event for ${config.table}:`, payload);
          
          try {
            callbackRef.current(payload);
          } catch (error) {
            logError(`Error in callback for ${config.table}:`, error);
          }
        };
        
        // Get or create a shared channel for this configuration
        const [channel, cleanup] = getOrCreateSharedChannel(channelName, config, wrappedCallback);
        
        channelRef.current = channel;
        cleanupRef.current = cleanup;

        const subscription = channel.subscribe((status) => {
          if (!mounted) return;
          
          log(`Subscription status for ${config.table}: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            retryCountRef.current = 0;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            
            if (retryCountRef.current < maxRetries) {
              const currentRetry = retryCountRef.current + 1;
              const delayMs = calculateBackoff(currentRetry, retryInterval);
              
              log(`Attempting reconnection (${currentRetry}/${maxRetries}) for ${config.table} in ${delayMs}ms`);
              retryCountRef.current = currentRetry;
              
              if (timeoutId) clearTimeout(timeoutId);
              
              timeoutId = setTimeout(() => {
                if (mounted) setupChannel();
              }, delayMs);
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
      mounted = false;
      log(`Cleaning up subscription for ${config.table}`);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [
    enabled, 
    config.table, 
    config.event, 
    config.schema, 
    config.filter, 
    maxRetries, 
    retryInterval, 
    onError, 
    enableRealtimeForTable,
    calculateBackoff,
    log,
    logError
  ]);

  return { isConnected };
}
