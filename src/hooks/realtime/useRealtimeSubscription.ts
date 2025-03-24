
import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { 
  SubscriptionConfig, 
  UseRealtimeSubscriptionOptions,
  RealtimeSubscriptionReturn
} from './types';
import { useRealtimeEnabler } from './useRealtimeEnabler';
import { useRealtimeLogger } from './useRealtimeLogger';
import { useEventCache } from './useEventCache';
import { useCircuitBreaker } from './useCircuitBreaker';

export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: any) => void,
  options: UseRealtimeSubscriptionOptions = {}
): RealtimeSubscriptionReturn {
  const {
    enabled = true,
    retryInterval = 3000,
    maxRetries = 5,
    onError,
    debugMode = false,
    enableRealtimeConfig = true
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { enableRealtimeForTable } = useRealtimeEnabler(debugMode);
  const { log, logError } = useRealtimeLogger(instanceIdRef.current, debugMode);
  const eventCache = useEventCache(100);
  const { isCircuitOpen, recordSuccess, recordFailure } = useCircuitBreaker(debugMode);

  const processEvent = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    // Create a unique identifier for this event
    const eventId = `${payload.eventType}-${
      payload.eventType === 'DELETE' ? 
      (payload.old as any)?.id : 
      (payload.new as any)?.id
    }-${payload.commit_timestamp}`;
    
    // Skip duplicate events
    if (eventCache.has(eventId)) {
      log(`Skipping duplicate event: ${eventId}`);
      return;
    }
    
    // Record this event in cache
    eventCache.add(eventId);
    
    log(`Received ${payload.eventType} event for ${config.table}:`, payload);
    
    // Enhanced interpreter status update handling
    if (config.table === 'interpreter_profiles' && payload.eventType === 'UPDATE' &&
        payload.new && payload.new.id && payload.new.status) {
      log(`Dispatching global interpreter status update event for interpreter ${payload.new.id}`);
      
      // Create a unique event ID to help with deduplication across components
      const statusEventId = `${payload.new.id}-${payload.new.status}-${Date.now()}`;
      
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreter_id: payload.new.id,
          status: payload.new.status,
          transaction_id: statusEventId,
          timestamp: Date.now()
        }
      }));
    }
    
    // Execute the provided callback with the payload
    callback(payload);
    
    // Record successful event processing
    recordSuccess();
  }, [callback, config.table, eventCache, log, recordSuccess]);

  useEffect(() => {
    if (!enabled || isCircuitOpen()) return;

    const setupChannel = async () => {
      try {
        if (channelRef.current) {
          log('Removing existing channel');
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Try to enable realtime for this table, but proceed with subscription even if it fails
        await enableRealtimeForTable(config.table, enableRealtimeConfig);

        // Generate specific channel name to avoid conflicts
        const channelName = `${config.table}-${config.event}-${instanceIdRef.current}`;
        log(`Setting up new channel with name: ${channelName}`);
        
        const channel = supabase.channel(channelName);
        
        // Create subscription configuration object based on provided config
        const subscriptionConfig: any = { 
          event: config.event, 
          schema: config.schema || 'public', 
          table: config.table
        };
        
        // Only add filter if it's provided
        if (config.filter) {
          subscriptionConfig.filter = config.filter;
        }
        
        channel.on(
          'postgres_changes' as any,
          subscriptionConfig,
          processEvent
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
              // Use exponential backoff with a small random jitter
              const jitter = Math.random() * 500;
              const delayMs = retryInterval * Math.pow(1.5, currentRetry - 1) + jitter;
              log(`Attempting reconnection (${currentRetry}/${maxRetries}) for ${config.table} in ${delayMs}ms`);
              retryCountRef.current = currentRetry;
              
              // Clear any existing timeout
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              
              timeoutRef.current = setTimeout(setupChannel, delayMs);
            } else {
              logError(`Max retries reached for ${config.table}`);
              recordFailure();
              onError?.({
                message: `Failed to establish realtime connection for ${config.table} after ${maxRetries} attempts`
              });
            }
          }
        });

      } catch (error) {
        logError(`Error setting up channel for ${config.table}:`, error);
        recordFailure();
        onError?.(error);
      }
    };

    setupChannel();

    return () => {
      log(`Cleaning up subscription for ${config.table}`);
      eventCache.cleanup();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
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
    enableRealtimeConfig,
    log,
    logError,
    eventCache,
    processEvent,
    isCircuitOpen
  ]);

  return { isConnected };
}
