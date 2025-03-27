
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
  channelNamePrefix?: string;
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

// Cache for active channel subscriptions to prevent duplicate subscriptions
type ChannelKey = string;
const activeChannels = new Map<ChannelKey, { 
  channel: RealtimeChannel, 
  refCount: number,
  callbacks: Map<string, (payload: any) => void>
}>();

// Determine if we're in production mode based on URL or environment
const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1' &&
         !window.location.hostname.includes('preview');
};

// Generate a consistent channel key for deduplication
const generateChannelKey = (config: SubscriptionConfig, prefix?: string): ChannelKey => {
  const { event, schema = 'public', table, filter = '' } = config;
  return `${prefix || 'default'}-${schema}-${table}-${event}${filter ? `-${filter}` : ''}`;
};

// Function to create a new channel if one doesn't exist
const getOrCreateChannel = (
  channelKey: string, 
  config: SubscriptionConfig, 
  callback: (payload: any) => void,
  callbackId: string,
  log: (message: string, ...args: any[]) => void
): RealtimeChannel => {
  // Check if we already have this channel
  const existing = activeChannels.get(channelKey);
  
  if (existing) {
    log(`Reusing existing channel: ${channelKey}, current refCount: ${existing.refCount}`);
    existing.refCount++;
    existing.callbacks.set(callbackId, callback);
    return existing.channel;
  }
  
  // Create a new channel
  log(`Creating new channel: ${channelKey}`);
  const channel = supabase.channel(channelKey);
  
  // Set up the channel for postgres changes
  channel.on(
    'postgres_changes' as any, 
    { 
      event: config.event, 
      schema: config.schema || 'public', 
      table: config.table, 
      filter: config.filter 
    }, 
    (payload) => {
      const activeChannelData = activeChannels.get(channelKey);
      if (activeChannelData) {
        // Dispatch payload to all registered callbacks
        activeChannelData.callbacks.forEach(cb => cb(payload));
      }
    }
  );
  
  // Store the new channel
  activeChannels.set(channelKey, { 
    channel, 
    refCount: 1,
    callbacks: new Map([[callbackId, callback]])
  });
  
  return channel;
};

// Function to release a channel reference
const releaseChannel = (
  channelKey: string, 
  callbackId: string,
  log: (message: string, ...args: any[]) => void
) => {
  const existing = activeChannels.get(channelKey);
  if (!existing) return;
  
  // Remove this specific callback
  existing.callbacks.delete(callbackId);
  
  // Decrease reference count
  existing.refCount--;
  log(`Releasing channel: ${channelKey}, new refCount: ${existing.refCount}`);
  
  // If no more references, remove the channel
  if (existing.refCount <= 0 || existing.callbacks.size === 0) {
    log(`Removing channel entirely: ${channelKey}`);
    supabase.removeChannel(existing.channel);
    activeChannels.delete(channelKey);
  }
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
    enableRealtimeConfig = true,
    channelNamePrefix = 'default'
  } = options;

  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const seenEvents = useRef<Set<string>>(new Set());
  
  // Generate a channel key for this subscription
  const channelKey = generateChannelKey(config, channelNamePrefix);
  const callbackId = useRef<string>(instanceIdRef.current).current;

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
    let channel: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      if (!enabled) return;

      try {
        // Try to enable realtime for this table, but proceed with subscription even if it fails
        await enableRealtimeForTable(config.table);

        // Get or create a channel
        channel = getOrCreateChannel(channelKey, config, callback, callbackId, log);
        
        // Subscribe to the channel
        channel.subscribe((status) => {
          log(`Subscription status for ${config.table} (${channelKey}): ${status}`);
          
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
              timeoutId = setTimeout(setupSubscription, delayMs);
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
        logError(`Error setting up subscription for ${config.table}:`, error);
        if (onError) onError(error);
      }
    };

    setupSubscription();

    return () => {
      log(`Cleaning up subscription for ${config.table} (${channelKey})`);
      clearTimeout(timeoutId);
      
      // Release this subscription's reference to the channel
      releaseChannel(channelKey, callbackId, log);
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
    channelKey,
    callbackId
  ]);

  return { isConnected };
}
