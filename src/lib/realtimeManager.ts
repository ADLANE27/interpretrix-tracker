
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter } from './events';

export interface SubscriptionConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
}

export interface SubscriptionOptions {
  enabled?: boolean;
  debounceTime?: number;
  enableTable?: boolean;
  channelNameOverride?: string;
}

// Cache to track enabled tables
export const enabledTablesCache = new Set<string>();
// Cache to track active channels for deduplication
const activeChannels = new Map<string, {
  channel: RealtimeChannel;
  refCount: number;
  callbacks: Set<(payload: any) => void>;
}>();

// Generate deterministic channel name for consistent references
export const generateChannelName = (config: SubscriptionConfig, suffix?: string): string => {
  const { event, table, filter } = config;
  const baseChannelName = `${table}-${event}${filter ? '-filtered' : ''}`;
  return suffix ? `${baseChannelName}-${suffix}` : baseChannelName;
};

// Enable realtime for a table if not already enabled
export const enableRealtimeForTable = async (tableName: string): Promise<boolean> => {
  // Skip if table is already cached as enabled
  if (enabledTablesCache.has(tableName)) {
    console.log(`[RealtimeManager] Table ${tableName} is already enabled (from cache)`);
    return true;
  }

  try {
    console.log(`[RealtimeManager] Enabling realtime for table ${tableName}`);
    const { data, error } = await supabase.functions.invoke('enable-realtime', {
      body: { table: tableName }
    });
    
    if (error) {
      console.error(`[RealtimeManager] Error enabling realtime for table ${tableName}:`, error);
      return false;
    }
    
    console.log(`[RealtimeManager] Successfully enabled realtime for table ${tableName}:`, data);
    enabledTablesCache.add(tableName);
    return true;
  } catch (error) {
    console.error(`[RealtimeManager] Exception enabling realtime for table ${tableName}:`, error);
    return false;
  }
};

// Subscribe to a table with deduplication and resource sharing
export const subscribeToTable = async (
  config: SubscriptionConfig,
  callback: (payload: any) => void,
  options: SubscriptionOptions = {}
): Promise<() => void> => {
  const { 
    enabled = true, 
    debounceTime = 0,
    enableTable = true,
    channelNameOverride
  } = options;
  
  if (!enabled) {
    return () => {}; // No-op cleanup if not enabled
  }

  // Try to enable realtime for the table if requested
  if (enableTable) {
    await enableRealtimeForTable(config.table);
  }

  // Generate a consistent channel name
  const channelName = channelNameOverride || generateChannelName(config);
  
  // Check if channel already exists
  if (activeChannels.has(channelName)) {
    const channelData = activeChannels.get(channelName)!;
    channelData.refCount++;
    channelData.callbacks.add(callback);
    
    console.log(`[RealtimeManager] Reusing existing channel: ${channelName}, refs: ${channelData.refCount}`);
    
    // Return cleanup function
    return () => {
      const data = activeChannels.get(channelName);
      if (data) {
        data.callbacks.delete(callback);
        data.refCount--;
        
        if (data.refCount <= 0) {
          console.log(`[RealtimeManager] Removing channel: ${channelName}`);
          supabase.removeChannel(data.channel);
          activeChannels.delete(channelName);
        }
      }
    };
  }
  
  // Create debounced callback if needed
  const processCallback = debounceTime > 0
    ? createDebouncedCallback(callback, debounceTime)
    : callback;
  
  // Create new channel
  const channel = supabase.channel(channelName);
  
  // Set up the subscription
  channel.on(
    'postgres_changes',
    {
      event: config.event,
      schema: config.schema || 'public',
      table: config.table,
      filter: config.filter
    },
    (payload: RealtimePostgresChangesPayload<any>) => {
      console.log(`[RealtimeManager] ${config.event} event received for ${config.table}:`, payload);
      
      // Emit a standard event for this table
      const eventName = `${config.table}:${config.event.toLowerCase()}`;
      eventEmitter.emit(eventName, payload);
      
      // Call the specific callback
      processCallback(payload);
    }
  ).subscribe(status => {
    console.log(`[RealtimeManager] Channel ${channelName} status:`, status);
  });
  
  // Store in active channels map
  activeChannels.set(channelName, {
    channel,
    refCount: 1,
    callbacks: new Set([processCallback])
  });
  
  // Return cleanup function
  return () => {
    const data = activeChannels.get(channelName);
    if (data) {
      data.callbacks.delete(processCallback);
      data.refCount--;
      
      if (data.refCount <= 0) {
        console.log(`[RealtimeManager] Removing channel: ${channelName}`);
        supabase.removeChannel(data.channel);
        activeChannels.delete(channelName);
      }
    }
  };
};

// Create a debounced version of a callback
function createDebouncedCallback(callback: (payload: any) => void, delay: number) {
  let timeoutId: NodeJS.Timeout | null = null;
  let latestPayload: any = null;
  
  return (payload: any) => {
    latestPayload = payload;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      callback(latestPayload);
      timeoutId = null;
    }, delay);
  };
}

// Helper hook to listen for standard table events
export function addTableEventListener(
  tableName: string, 
  event: 'insert' | 'update' | 'delete' | '*',
  listener: (payload: any) => void
): () => void {
  const eventName = `${tableName}:${event}`;
  eventEmitter.on(eventName, listener);
  
  return () => {
    eventEmitter.off(eventName, listener);
  };
}

// Check status of active channels
export function getActiveChannelsStatus(): {
  count: number;
  channels: { name: string; refCount: number; callbackCount: number }[];
} {
  return {
    count: activeChannels.size,
    channels: Array.from(activeChannels.entries()).map(([name, data]) => ({
      name,
      refCount: data.refCount,
      callbackCount: data.callbacks.size
    }))
  };
}
