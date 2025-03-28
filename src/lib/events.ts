
// Define all application events in a central location
export const EVENT_INTERPRETER_STATUS_UPDATE = 'interpreter-status-update';
export const EVENT_UNREAD_MENTIONS_UPDATED = 'unread-mentions-updated';
export const EVENT_NEW_MESSAGE_RECEIVED = 'new-message-received';
export const EVENT_CONNECTION_STATUS_CHANGE = 'connection-status-change';

// Re-export from realtimeManager to maintain compatibility
export { eventEmitter } from './realtimeManager';
