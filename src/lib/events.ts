
import EventEmitter from 'events';

export const EVENT_CONNECTION_STATUS_CHANGE = 'connection_status_change';
export const EVENT_INTERPRETER_STATUS_UPDATE = 'interpreter-status-update';
export const EVENT_UNREAD_MENTIONS_UPDATED = 'unread-mentions-updated';
export const EVENT_NEW_MESSAGE_RECEIVED = 'new-message-received';

export const eventEmitter = new EventEmitter();
