
import mitt from 'mitt';

// Create an event emitter instance
export const eventEmitter = mitt();

// Define event names as constants to avoid typos
export const EVENT_UNREAD_MENTIONS_UPDATED = 'unread_mentions_updated';
export const EVENT_NEW_MESSAGE_RECEIVED = 'new_message_received';
