
import { useEffect, useRef, useState } from 'react';
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

export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: any) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  const {
    enabled = true,
    retryInterval = 5000,
    maxRetries = 5,
    onError,
    debugMode = false
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const seenEvents = useRef<Set<string>>(new Set());

  const log = (message: string, ...args: any[]) => {
    if (debugMode) {
      console.log(`[Realtime ${instanceIdRef.current}] ${message}`, ...args);
    }
  };

  const logError = (message: string, ...args: any[]) => {
    console.error(`[Realtime ${instanceIdRef.current}] ${message}`, ...args);
  };

  // Function to enable realtime for table via edge function
  const enableRealtimeForTable = async (tableName: string) => {
    try {
      log(`Enabling realtime for table ${tableName}`);
      const { data, error } = await supabase.functions.invoke('enable-realtime', {
        body: { table: tableName }
      });
      
      if (error) {
        logError(`Error enabling realtime for table ${tableName}:`, error);
        return false;
      }
      
      log(`Successfully enabled realtime for table ${tableName}:`, data);
      return true;
    } catch (error) {
      logError(`Error calling enable-realtime function for table ${tableName}:`, error);
      return false;
    }
  };

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

        // First ensure realtime is enabled for this table
        await enableRealtimeForTable(config.table);

        // Create a unique channel name based on the table, config and a unique ID
        // This ensures we don't have conflicts with multiple subscriptions to the same table
        const channelName = `${config.table}-${config.event}${config.filter ? '-filtered' : ''}-${instanceIdRef.current}`;
        log(`Setting up new channel with name: ${channelName}`);
        
        // Create a new channel
        const channel = supabase.channel(channelName);
        
        // Set up the subscription with the correct pattern:
        // 1. Create the channel
        // 2. Set up event handlers with .on()
        // 3. Subscribe to the channel
        channelRef.current = channel.on(
          'postgres_changes',
          {
            event: config.event,
            schema: config.schema || 'public',
            table: config.table,
            filter: config.filter,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // Generate a unique event ID for deduplication
            const eventId = `${payload.eventType}-${
              payload.eventType === 'DELETE' ? 
              (payload.old as any)?.id : 
              (payload.new as any)?.id
            }-${payload.commit_timestamp}`;
            
            // Skip if we've already seen this exact event
            if (seenEvents.current.has(eventId)) {
              log(`Skipping duplicate event: ${eventId}`);
              return;
            }
            
            // Add to seen events set for deduplication
            seenEvents.current.add(eventId);
            
            // Limit the size of the seen events set
            if (seenEvents.current.size > 100) {
              // Convert to array, remove oldest entries
              const eventsArray = Array.from(seenEvents.current);
              seenEvents.current = new Set(eventsArray.slice(-50));
            }
            
            log(`Received ${config.event} event for ${config.table}:`, payload);
            callback(payload);
          }
        );

        // Subscribe to the channel after setting up the event handlers
        channelRef.current.subscribe((status) => {
          log(`Subscription status for ${config.table}: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            retryCountRef.current = 0;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            
            if (retryCountRef.current < maxRetries) {
              const currentRetry = retryCountRef.current + 1;
              const delayMs = retryInterval * Math.pow(1.5, currentRetry - 1); // Exponential backoff
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
  }, [enabled, config.table, config.event, config.schema, config.filter, callback, maxRetries, retryInterval, onError, debugMode]);

  return { isConnected };
}
