
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
}

export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: any) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  const {
    enabled = true,
    retryInterval = 5000,
    maxRetries = 3,
    onError
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const seenEvents = useRef<Set<string>>(new Set());

  // Function to enable realtime for table via edge function
  const enableRealtimeForTable = async (tableName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('enable-realtime', {
        body: { table: tableName }
      });
      
      if (error) {
        console.error(`[Realtime] Error enabling realtime for table ${tableName}:`, error);
        return false;
      }
      
      console.log(`[Realtime] Successfully enabled realtime for table ${tableName}:`, data);
      return true;
    } catch (error) {
      console.error(`[Realtime] Error calling enable-realtime function for table ${tableName}:`, error);
      return false;
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const setupChannel = async () => {
      if (!enabled) return;

      try {
        if (channelRef.current) {
          console.log('[Realtime] Removing existing channel');
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // First ensure realtime is enabled for this table
        await enableRealtimeForTable(config.table);

        // Use the table name as the base for the channel name
        // This ensures consistent naming across different components
        const channelName = `realtime-${config.table}`;
        console.log('[Realtime] Setting up new channel with name:', channelName);
        
        const channel = supabase.channel(channelName);
        
        channelRef.current = channel.on(
          'postgres_changes' as any,
          {
            event: config.event,
            schema: config.schema || 'public',
            table: config.table,
            filter: config.filter,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // Access the correct properties based on the payload structure
            const eventType = payload.eventType;
            
            // Generate a unique event ID for deduplication
            const eventId = `${eventType}-${
              eventType === 'DELETE' ? 
              (payload.old as any)?.id : 
              (payload.new as any)?.id
            }-${payload.commit_timestamp}`;
            
            // Skip if we've already seen this exact event
            if (seenEvents.current.has(eventId)) {
              console.log('[Realtime] Skipping duplicate event:', eventId);
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
            
            console.log(`[Realtime] Received ${config.event} event for ${config.table}:`, payload);
            callback(payload);
          }
        );

        channelRef.current.subscribe(async (status) => {
          console.log(`[Realtime] Subscription status for ${config.table}:`, status);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            retryCountRef.current = 0;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            
            if (retryCountRef.current < maxRetries) {
              console.log(`[Realtime] Attempting reconnection for ${config.table}`);
              retryCountRef.current++;
              timeoutId = setTimeout(setupChannel, retryInterval);
            } else {
              console.error(`[Realtime] Max retries reached for ${config.table}`);
              onError?.({
                message: `Failed to establish realtime connection for ${config.table} after ${maxRetries} attempts`
              });
            }
          }
        });

      } catch (error) {
        console.error(`[Realtime] Error setting up channel for ${config.table}:`, error);
        onError?.(error);
      }
    };

    setupChannel();

    return () => {
      console.log(`[Realtime] Cleaning up subscription for ${config.table}`);
      clearTimeout(timeoutId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled, config.table, config.event, config.schema, config.filter, callback, maxRetries, retryInterval, onError]);

  return { isConnected };
}
