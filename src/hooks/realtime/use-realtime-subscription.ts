
import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { enableRealtimeForTable } from './realtime-enabler';
import { registerSubscription, unregisterSubscription, getSubscriptionCount } from './subscription-registry';
import { resetCircuitBreaker } from './circuit-breaker';
import { SubscriptionConfig, UseRealtimeSubscriptionOptions, SubscriptionCallback } from './types';

/**
 * Hook for subscribing to realtime updates from Supabase
 */
export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: SubscriptionCallback,
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

  // Track subscription for this component instance
  useEffect(() => {
    const userId = instanceIdRef.current;
    const tableName = config.table;
    
    // Register this subscription
    registerSubscription(userId, tableName);
    
    log(`Registered subscription for ${tableName} (total: ${getSubscriptionCount(userId)})`);
    
    return () => {
      const allRemoved = unregisterSubscription(userId, tableName);
      
      if (allRemoved) {
        log(`Removed all subscriptions for ${userId}`);
      } else {
        log(`Unregistered subscription for ${tableName} (remaining: ${getSubscriptionCount(userId)})`);
      }
    };
  }, [config.table, log]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    mountedRef.current = true;

    const setupChannel = async () => {
      if (!enabled || !mountedRef.current) return;

      try {
        if (channelRef.current) {
          log('Removing existing channel');
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Try to enable realtime for this table
        const enablementResult = await enableRealtimeForTable(config.table, debugMode);
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
        
        // Fix: Use the correct method signature for the Supabase Realtime API
        // @ts-ignore - Ignoring TypeScript error as the Supabase types might be out of date
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
    debugMode,
    log,
    logError
  ]);

  return { 
    isConnected,
    resetCircuitBreaker
  };
}
