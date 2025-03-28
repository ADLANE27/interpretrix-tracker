
import { SupabaseClient } from '@supabase/supabase-js';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_UNREAD_MENTIONS_UPDATED, EVENT_NEW_MESSAGE_RECEIVED, EVENT_CONNECTION_STATUS_CHANGE } from './events';
import { CustomEventEmitter } from './customEventEmitter';

interface RealtimeConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema: string;
  table: string;
  filter?: string;
  callback: (payload: any) => void;
}

class RealtimeManager {
  private supabase: SupabaseClient;
  private channels: any[] = [];
  private connectionStatus: boolean = true;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async init() {
    console.log('Initializing RealtimeManager');
    this.channels = [];
    this.initInterpreterStatusChannel();
    this.initMessageMentionsChannel();
    
    // Emit initial connection status
    this.updateConnectionStatus(true);
  }

  cleanup() {
    console.log('Cleaning up RealtimeManager');
    this.channels.forEach(channel => {
      this.supabase.removeChannel(channel);
    });
    this.channels = [];
  }

  updateConnectionStatus(isConnected: boolean) {
    if (this.connectionStatus !== isConnected) {
      this.connectionStatus = isConnected;
      console.log(`[RealtimeManager] Connection status changed: ${isConnected ? 'connected' : 'disconnected'}`);
      eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, isConnected);
    }
  }

  initInterpreterStatusChannel() {
    console.log('Initializing interpreter status channel');
    
    const channel = this.supabase
      .channel('interpreter-status-changes')
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interpreter_profiles',
          filter: 'status=eq.available'
        },
        (payload) => {
          console.log('Interpreter status changed to available:', payload);
          eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
            interpreterId: payload.new?.id,
            status: payload.new?.status
          });
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interpreter_profiles',
          filter: 'status=neq.available'
        },
        (payload) => {
          console.log('Interpreter status changed from available:', payload);
          eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
            interpreterId: payload.new?.id,
            status: payload.new?.status
          });
        }
      )
      .subscribe((status) => {
        console.log(`Interpreter status channel subscription status: ${status}`);
        this.updateConnectionStatus(status === 'SUBSCRIBED');
      });

    this.channels.push(channel);
  }

  initMessageMentionsChannel() {
    console.log('Initializing message mentions channel');
    
    const channel = this.supabase
      .channel('message-mentions')
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_mentions'
        },
        (payload) => {
          console.log('New message mention:', payload);
          const mentionedUserId = payload.new?.mentioned_user_id;
          
          if (mentionedUserId) {
            eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, 1);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Message mentions channel subscription status: ${status}`);
        this.updateConnectionStatus(status === 'SUBSCRIBED');
      });

    this.channels.push(channel);
  }

  setupChannelListeners(configs: RealtimeConfig[]) {
    const channelName = `channel-${Date.now()}`;
    console.log(`Setting up channel ${channelName} with configs:`, configs);

    try {
      let channel = this.supabase.channel(channelName);
      
      configs.forEach(config => {
        channel = channel.on(
          'postgres_changes' as any,
          {
            event: config.event,
            schema: config.schema || 'public',
            table: config.table,
            filter: config.filter
          },
          config.callback
        );
      });
      
      const subscription = channel.subscribe((status) => {
        console.log(`Channel ${channelName} subscription status:`, status);
        this.updateConnectionStatus(status === 'SUBSCRIBED');
      });
      
      this.channels.push(channel);
      
      return () => {
        console.log(`Cleaning up channel ${channelName}`);
        this.supabase.removeChannel(channel);
        this.channels = this.channels.filter(c => c !== channel);
      };
    } catch (error) {
      console.error(`Error setting up channel ${channelName}:`, error);
      this.updateConnectionStatus(false);
      return () => {};
    }
  }

  emitEvent(eventName: string, data: any) {
    console.log(`[RealtimeManager] Emitting event ${eventName} with data:`, data);
    
    if (eventName === EVENT_INTERPRETER_STATUS_UPDATE) {
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, data);
    } else if (eventName === EVENT_UNREAD_MENTIONS_UPDATED) {
      eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, data);
    } else if (eventName === EVENT_NEW_MESSAGE_RECEIVED) {
      eventEmitter.emit(EVENT_NEW_MESSAGE_RECEIVED, data);
    }
  }

  on(event: string, listener: (...args: any[]) => void) {
    eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    eventEmitter.off(event, listener);
  }
}

export default RealtimeManager;
