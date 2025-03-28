
import { SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from './eventEmitter';

// Use the centralized event names from events.ts
import { 
  EVENT_INTERPRETER_STATUS_UPDATE,
  EVENT_UNREAD_MENTIONS_UPDATED,
  EVENT_NEW_MESSAGE_RECEIVED,
  EVENT_CONNECTION_STATUS_CHANGE
} from './events';

// Create an instance of EventEmitter
export const eventEmitter = new EventEmitter();

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

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async init() {
    console.log('Initializing RealtimeManager');
    this.channels = [];
    this.initInterpreterStatusChannel();
    this.initMessageMentionsChannel();
    this.initMessagesChannel();
  }

  cleanup() {
    console.log('Cleaning up RealtimeManager');
    this.channels.forEach(channel => {
      this.supabase.removeChannel(channel);
    });
    this.channels = [];
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
          eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
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
          eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
        }
      )
      .subscribe((status) => {
        console.log('Interpreter status channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, { status: 'connected', channel: 'interpreter-status' });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, { status: 'disconnected', channel: 'interpreter-status', error: status });
        }
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
            // Emit the event with the user ID and count
            this.emitEvent(EVENT_UNREAD_MENTIONS_UPDATED, {
              userId: mentionedUserId,
              count: 1
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Message mentions channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, { status: 'connected', channel: 'message-mentions' });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, { status: 'disconnected', channel: 'message-mentions', error: status });
        }
      });

    this.channels.push(channel);
  }

  // Add a new method to initialize a channel for messages
  initMessagesChannel() {
    console.log('Initializing messages channel');
    
    const channel = this.supabase
      .channel('chat-messages')
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          console.log('New chat message received:', payload);
          this.emitEvent(EVENT_NEW_MESSAGE_RECEIVED, payload.new);
        }
      )
      .subscribe((status) => {
        console.log('Messages channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, { status: 'connected', channel: 'chat-messages' });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, { status: 'disconnected', channel: 'chat-messages', error: status });
        }
      });

    this.channels.push(channel);
  }

  setupChannelListeners(configs: RealtimeConfig[]) {
    const channelName = `channel-${Date.now()}`;
    console.log(`Setting up channel ${channelName} with configs:`, configs);

    try {
      let channel = this.supabase.channel(channelName);
      
      // Add all configurations to the channel
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
      
      // Subscribe to the channel
      const subscription = channel.subscribe((status) => {
        console.log(`Channel ${channelName} subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, { status: 'connected', channel: channelName });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, { status: 'disconnected', channel: channelName, error: status });
        }
      });
      
      // Store the channel in our array so we can clean it up later
      this.channels.push(channel);
      
      // Return a function to unsubscribe from this specific channel
      return () => {
        console.log(`Cleaning up channel ${channelName}`);
        this.supabase.removeChannel(channel);
        this.channels = this.channels.filter(c => c !== channel);
      };
    } catch (error) {
      console.error(`Error setting up channel ${channelName}:`, error);
      return () => {};
    }
  }

  emitEvent(eventName: string, data: any) {
    // Type-safe event emission
    if (eventName === EVENT_INTERPRETER_STATUS_UPDATE) {
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
    } else if (eventName === EVENT_UNREAD_MENTIONS_UPDATED) {
      eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, data);
    } else if (eventName === EVENT_NEW_MESSAGE_RECEIVED) {
      eventEmitter.emit(EVENT_NEW_MESSAGE_RECEIVED, data);
    } else if (eventName === EVENT_CONNECTION_STATUS_CHANGE) {
      eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, data);
    }
  }

  on(event: string, listener: (...args: any[]) => void) {
    eventEmitter.on(event, listener);
    return () => eventEmitter.off(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    eventEmitter.off(event, listener);
  }
}

export default RealtimeManager;
