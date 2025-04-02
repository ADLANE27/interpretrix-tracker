
import { CustomEventEmitter } from './customEventEmitter';

// Event types
export const EVENT_INTERPRETER_STATUS_UPDATE = 'interpreter-status-update';
export const EVENT_UNREAD_MENTIONS_UPDATED = 'unread-mentions-updated';
export const EVENT_NEW_MESSAGE_RECEIVED = 'new-message-received';
export const EVENT_CONNECTION_STATUS_CHANGE = 'connection-status-change';
export const EVENT_NOTIFICATION_SETTINGS_UPDATED = 'notification-settings-updated';

// Create an event emitter instance
export const eventEmitter = new CustomEventEmitter();

// Set max listeners to avoid memory leak warnings
// Status updates need more listeners due to the number of interpreter cards
eventEmitter.setMaxListeners(100);
