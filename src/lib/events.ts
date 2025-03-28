
import EventEmitter from 'events';

// Event types
export const EVENT_INTERPRETER_STATUS_UPDATE = 'interpreter-status-update';
export const EVENT_UNREAD_MENTIONS_UPDATED = 'unread-mentions-updated';
export const EVENT_NEW_MESSAGE_RECEIVED = 'new-message-received';

// Create an event emitter instance
export const eventEmitter = new EventEmitter();

// Set max listeners to avoid memory leak warnings
eventEmitter.setMaxListeners(20);
