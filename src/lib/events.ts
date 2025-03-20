
import mitt from 'mitt';

// Define event types
type EventTypes = {
  unread_mentions_updated: number;
  new_message_received: {
    message: any; 
    channelId: string;
    isMention?: boolean;
  };
};

// Create an event emitter instance with typed events
export const eventEmitter = mitt<EventTypes>();

// Define event names as constants to avoid typos
export const EVENT_UNREAD_MENTIONS_UPDATED = 'unread_mentions_updated';
export const EVENT_NEW_MESSAGE_RECEIVED = 'new_message_received';
