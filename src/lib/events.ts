
import mitt from 'mitt';

// Define event types
export const EVENT_INTERPRETER_STATUS_UPDATE = 'interpreter-status-update';
export const EVENT_UNREAD_MENTIONS_UPDATED = 'unread-mentions-updated';
export const EVENT_NEW_MESSAGE_RECEIVED = 'new-message-received';
export const EVENT_CONNECTION_STATUS_CHANGE = 'connection-status-change';

// Create a typed event emitter
type Events = {
  [EVENT_INTERPRETER_STATUS_UPDATE]: void;
  [EVENT_UNREAD_MENTIONS_UPDATED]: number;
  [EVENT_NEW_MESSAGE_RECEIVED]: any;
  [EVENT_CONNECTION_STATUS_CHANGE]: boolean;
};

export const eventEmitter = mitt<Events>();
