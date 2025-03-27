
import { supabase } from "@/integrations/supabase/client";
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_UNREAD_MENTIONS_UPDATED, EVENT_NEW_MESSAGE_RECEIVED } from './events';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface SubscriptionConfig {
  event: PostgresEvent;
  schema?: string;
  table: string;
  filter?: string;
}

interface RealtimeChannel {
  id: string;
  configs: SubscriptionConfig[];
  channel: any;
  status: 'connected' | 'disconnected' | 'error';
  createTime: Date;
  error?: string;
}

class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private globalListeners: Map<string, Function[]> = new Map();
  private isInitialized: boolean = false;
  private debugMode: boolean = false;

  constructor() {
    this.initialize();
  }

  setDebug(enabled: boolean) {
    this.debugMode = enabled;
  }

  private log(...args: any[]) {
    if (this.debugMode) {
      console.log('[RealtimeManager]', ...args);
    }
  }

  initialize() {
    if (this.isInitialized) return;
    
    this.log('Initializing RealtimeManager');
    
    // Create standard subscriptions
    this.createStandardSubscriptions();
    
    // Add visibility change handler
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    this.isInitialized = true;
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.log('Document became visible, reconnecting channels');
      this.reconnectAllChannels();
    }
  }

  private createStandardSubscriptions() {
    // Create interpreter status subscription
    this.createSubscription('interpreter-status', [
      {
        event: 'UPDATE',
        table: 'interpreter_profiles',
        filter: 'status=eq.available,status=eq.busy,status=eq.pause,status=eq.unavailable'
      }
    ], (payload) => {
      this.log('Interpreter status update received:', payload);
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
    });
    
    // Create message mentions subscription
    this.createSubscription('message-mentions', [
      {
        event: 'INSERT',
        table: 'message_mentions',
      }
    ], (payload) => {
      this.log('New message mention received:', payload);
      const mentionedUserId = payload.new?.mentioned_user_id;
      
      if (mentionedUserId) {
        eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, 1);
      }
    });
  }

  createSubscription(id: string, configs: SubscriptionConfig[], callback: (payload: any) => void): string {
    if (this.channels.has(id)) {
      this.log(`Channel ${id} already exists, removing existing channel`);
      this.removeSubscription(id);
    }
    
    try {
      const channel = supabase.channel(`realtime-${id}`);
      
      // Add all configurations to the channel
      configs.forEach(config => {
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
      });
      
      // Subscribe to the channel
      channel.subscribe(status => {
        this.log(`Channel ${id} status:`, status);
        
        if (status === 'SUBSCRIBED') {
          this.updateChannelStatus(id, 'connected');
        } else if (status === 'CHANNEL_ERROR') {
          this.updateChannelStatus(id, 'error', 'Channel error');
        } else if (status === 'TIMED_OUT') {
          this.updateChannelStatus(id, 'error', 'Connection timed out');
        }
      });
      
      // Store the channel
      this.channels.set(id, {
        id,
        configs,
        channel,
        status: 'disconnected',
        createTime: new Date(),
      });
      
      this.log(`Created subscription ${id}`);
      return id;
    } catch (error) {
      this.log(`Error creating subscription ${id}:`, error);
      throw error;
    }
  }

  removeSubscription(id: string): boolean {
    const channel = this.channels.get(id);
    if (!channel) return false;
    
    try {
      supabase.removeChannel(channel.channel);
      this.channels.delete(id);
      this.log(`Removed subscription ${id}`);
      return true;
    } catch (error) {
      this.log(`Error removing subscription ${id}:`, error);
      return false;
    }
  }

  private updateChannelStatus(id: string, status: 'connected' | 'disconnected' | 'error', error?: string) {
    const channel = this.channels.get(id);
    if (!channel) return;
    
    channel.status = status;
    channel.error = error;
    
    this.channels.set(id, channel);
    this.notifyListeners('channelStatusChanged', { id, status, error });
  }

  reconnectChannel(id: string): boolean {
    const channel = this.channels.get(id);
    if (!channel) return false;
    
    try {
      supabase.removeChannel(channel.channel);
      
      const newChannel = supabase.channel(`realtime-${id}`);
      channel.channel = newChannel;
      
      this.channels.set(id, channel);
      this.log(`Reconnected channel ${id}`);
      return true;
    } catch (error) {
      this.log(`Error reconnecting channel ${id}:`, error);
      return false;
    }
  }

  reconnectAllChannels() {
    for (const id of this.channels.keys()) {
      this.reconnectChannel(id);
    }
  }

  getChannelStatus(id: string): 'connected' | 'disconnected' | 'error' | null {
    const channel = this.channels.get(id);
    return channel ? channel.status : null;
  }

  getAllChannels(): RealtimeChannel[] {
    return Array.from(this.channels.values());
  }

  // Event handling system
  private notifyListeners(event: string, data: any) {
    const listeners = this.globalListeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  addGlobalListener(event: string, callback: Function) {
    const listeners = this.globalListeners.get(event) || [];
    listeners.push(callback);
    this.globalListeners.set(event, listeners);
  }

  removeGlobalListener(event: string, callback?: Function) {
    if (!callback) {
      this.globalListeners.delete(event);
      return;
    }
    
    const listeners = this.globalListeners.get(event) || [];
    const updatedListeners = listeners.filter(listener => listener !== callback);
    this.globalListeners.set(event, updatedListeners);
  }

  // Utility method to emit events using eventEmitter
  emitEvent(eventName: string, data: any) {
    // Type check the event name to ensure it's a valid event
    if (eventName === EVENT_INTERPRETER_STATUS_UPDATE) {
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
    } else if (eventName === EVENT_UNREAD_MENTIONS_UPDATED) {
      eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, data);
    } else if (eventName === EVENT_NEW_MESSAGE_RECEIVED) {
      eventEmitter.emit(EVENT_NEW_MESSAGE_RECEIVED, data);
    }
  }

  cleanup() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    for (const channel of this.channels.values()) {
      supabase.removeChannel(channel.channel);
    }
    
    this.channels.clear();
    this.globalListeners.clear();
    this.isInitialized = false;
  }
}

// Create a singleton instance
export const realtimeManager = new RealtimeManager();
