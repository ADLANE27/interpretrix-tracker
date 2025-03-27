
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { CONNECTION_CONSTANTS } from '@/hooks/supabase-connection/constants';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';

// Determine if we're in production mode based on URL or environment
const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1' &&
         !window.location.hostname.includes('preview');
};

interface SubscriptionConfig {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
}

interface RealtimeContextType {
  subscribe: (
    config: SubscriptionConfig,
    callback: (payload: any) => void
  ) => () => void;
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// Cache to prevent duplicate subscriptions
const activeSubscriptions = new Map<string, Set<(payload: any) => void>>();

// Track channels to prevent duplicate creation
const activeChannels = new Map<string, RealtimeChannel>();

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const seenEvents = useRef<Set<string>>(new Set());
  
  // Function to make a subscription key for caching
  const makeSubscriptionKey = (config: SubscriptionConfig) => {
    return `${config.schema || 'public'}.${config.table}.${config.event}${config.filter ? `.${config.filter}` : ''}`;
  };

  // Clean up function for all channels
  const cleanupChannels = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    channelsRef.current.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('[RealtimeContext] Error removing channel:', error);
      }
    });
    
    channelsRef.current = [];
    activeChannels.clear();
  }, []);

  // Connection check and reconnection logic
  useEffect(() => {
    const checkConnection = () => {
      const channels = supabase.getChannels();
      const anyConnected = channels.some(
        (channel: RealtimeChannel) => channel.state === 'joined'
      );
      
      setIsConnected(anyConnected);
      
      if (!anyConnected && channelsRef.current.length > 0) {
        console.log('[RealtimeContext] No connected channels, attempting reconnection');
        reconnect();
      }
    };
    
    const reconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      
      // Cleanup existing channels before reconnecting
      cleanupChannels();
      
      // Rebuild all active subscriptions
      activeSubscriptions.forEach((callbacks, key) => {
        const [schema, table, event, filter] = key.split('.');
        
        if (callbacks.size > 0) {
          setupChannel({
            schema,
            table,
            event: event as 'INSERT' | 'UPDATE' | 'DELETE' | '*',
            filter: filter || undefined
          });
        }
      });
    };
    
    const intervalId = setInterval(checkConnection, 30000);
    
    // Set up visibility change event listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkConnection();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', reconnect);
    
    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', reconnect);
      cleanupChannels();
    };
  }, [cleanupChannels]);
  
  // Setup a channel for a specific subscription
  const setupChannel = useCallback((config: SubscriptionConfig) => {
    const { schema = 'public', table, event, filter } = config;
    
    // Create a stable channel name
    const channelName = isProduction()
      ? `${table}-${event}${filter ? '-filtered' : ''}`
      : `${table}-${event}${filter ? '-filtered' : ''}-${Date.now()}`;
    
    // Avoid duplicate channels
    if (activeChannels.has(channelName)) {
      console.log(`[RealtimeContext] Channel ${channelName} already exists, reusing`);
      return activeChannels.get(channelName)!;
    }
    
    console.log(`[RealtimeContext] Setting up channel: ${channelName}`);
    
    try {
      const channel = supabase.channel(channelName);
      
      // Fixed: Use the properly typed .on method for postgres_changes
      channel.on(
        'postgres_changes',  // This is the correct event type
        {
          event,
          schema,
          table,
          filter
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Deduplicate events using a combination of eventType, record ID, and timestamp
          const eventId = `${payload.eventType}-${
            payload.eventType === 'DELETE' ? 
            (payload.old as any)?.id : 
            (payload.new as any)?.id
          }-${payload.commit_timestamp}`;
          
          if (seenEvents.current.has(eventId)) {
            console.log(`[RealtimeContext] Skipping duplicate event: ${eventId}`);
            return;
          }
          
          seenEvents.current.add(eventId);
          
          // Limit cache size
          if (seenEvents.current.size > 100) {
            const eventsArray = Array.from(seenEvents.current);
            seenEvents.current = new Set(eventsArray.slice(-50));
          }
          
          const subscriptionKey = makeSubscriptionKey(config);
          const callbacks = activeSubscriptions.get(subscriptionKey);
          
          if (callbacks) {
            callbacks.forEach(callback => {
              try {
                callback(payload);
              } catch (error) {
                console.error(`[RealtimeContext] Error in callback for ${subscriptionKey}:`, error);
              }
            });
          }
        }
      );
      
      channel.subscribe(status => {
        console.log(`[RealtimeContext] Channel ${channelName} status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[RealtimeContext] Error in channel ${channelName}`);
          
          // Only attempt reconnect if channel was previously successful
          if (activeChannels.has(channelName)) {
            activeChannels.delete(channelName);
            
            if (!reconnectTimerRef.current) {
              reconnectTimerRef.current = setTimeout(() => {
                reconnectTimerRef.current = null;
                setupChannel(config);
              }, CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY);
            }
          }
        }
      });
      
      channelsRef.current.push(channel);
      activeChannels.set(channelName, channel);
      
      return channel;
    } catch (error) {
      console.error(`[RealtimeContext] Error setting up channel for ${table}:`, error);
      return null;
    }
  }, []);

  // Main subscription function exposed to consumers
  const subscribe = useCallback((
    config: SubscriptionConfig,
    callback: (payload: any) => void
  ) => {
    const subscriptionKey = makeSubscriptionKey(config);
    
    // Register callback
    if (!activeSubscriptions.has(subscriptionKey)) {
      activeSubscriptions.set(subscriptionKey, new Set());
    }
    
    const callbacks = activeSubscriptions.get(subscriptionKey)!;
    callbacks.add(callback);
    
    // Setup channel if this is the first subscriber
    if (callbacks.size === 1) {
      setupChannel(config);
    }
    
    // Return unsubscribe function
    return () => {
      if (activeSubscriptions.has(subscriptionKey)) {
        const callbacks = activeSubscriptions.get(subscriptionKey)!;
        callbacks.delete(callback);
        
        // If no more callbacks, we could optionally remove the channel
        if (callbacks.size === 0) {
          activeSubscriptions.delete(subscriptionKey);
        }
      }
    };
  }, [setupChannel]);

  // Effect to try enabling realtime for tables
  useEffect(() => {
    // Try to enable realtime for commonly used tables
    const enableRealtimeForTables = async () => {
      const tables = ['interpreter_profiles', 'interpretation_missions', 'private_reservations'];
      
      for (const table of tables) {
        try {
          await supabase.functions.invoke('enable-realtime', {
            body: { table }
          });
          console.log(`[RealtimeContext] Enabled realtime for ${table}`);
        } catch (error) {
          console.error(`[RealtimeContext] Failed to enable realtime for ${table}:`, error);
        }
      }
    };
    
    enableRealtimeForTables();
  }, []);

  return (
    <RealtimeContext.Provider value={{ subscribe, isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

// Custom hook that combines Realtime context with useMissionUpdates functionality
export const useRealtimeSync = (onUpdate: () => void) => {
  const { subscribe, isConnected } = useRealtime();
  
  // Setup visibility change event listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onUpdate();
      }
    };

    window.addEventListener("online", handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for interpreter status update events
    const handleStatusUpdate = () => {
      console.log('[useRealtimeSync] Received manual status update event');
      onUpdate();
    };
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);

    return () => {
      window.removeEventListener("online", handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [onUpdate]);

  // Subscribe to mission changes
  useEffect(() => {
    const unsubscribeMissions = subscribe(
      {
        event: '*',
        table: 'interpretation_missions'
      },
      () => {
        console.log('[useRealtimeSync] Mission update received');
        onUpdate();
      }
    );
    
    // Subscribe to reservation changes
    const unsubscribeReservations = subscribe(
      {
        event: '*',
        table: 'private_reservations'
      },
      () => {
        console.log('[useRealtimeSync] Private reservation update received');
        onUpdate();
      }
    );
    
    // Subscribe to interpreter profile status changes
    const unsubscribeProfiles = subscribe(
      {
        event: 'UPDATE',
        table: 'interpreter_profiles',
        filter: 'status=eq.available,status=eq.busy,status=eq.pause,status=eq.unavailable'
      },
      () => {
        console.log('[useRealtimeSync] Interpreter status update received');
        onUpdate();
      }
    );
    
    return () => {
      unsubscribeMissions();
      unsubscribeReservations();
      unsubscribeProfiles();
    };
  }, [subscribe, onUpdate]);

  return { isConnected };
};
