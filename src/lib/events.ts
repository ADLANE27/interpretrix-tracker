
import { CustomEventEmitter } from './customEventEmitter';

// Event types
export const EVENT_INTERPRETER_STATUS_UPDATE = 'interpreter-status-update';
export const EVENT_UNREAD_MENTIONS_UPDATED = 'unread-mentions-updated';
export const EVENT_NEW_MESSAGE_RECEIVED = 'new-message-received';
export const EVENT_CONNECTION_STATUS_CHANGE = 'connection-status-change';

// Logging level controls
export const LOG_LEVEL = {
  NONE: 0,
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
  DEBUG: 4
};

// Current log level setting - change to reduce logging
export const CURRENT_LOG_LEVEL = LOG_LEVEL.WARNING;

// Create an event emitter instance
export const eventEmitter = new CustomEventEmitter();

// Set max listeners to avoid memory leak warnings
eventEmitter.setMaxListeners(20);

// Utility logging function that respects log level
export const logByLevel = (level: number, message: string, ...args: any[]) => {
  if (level <= CURRENT_LOG_LEVEL) {
    switch (level) {
      case LOG_LEVEL.ERROR:
        console.error(message, ...args);
        break;
      case LOG_LEVEL.WARNING:
        console.warn(message, ...args);
        break;
      case LOG_LEVEL.INFO:
        console.info(message, ...args);
        break;
      case LOG_LEVEL.DEBUG:
        console.log(message, ...args);
        break;
    }
  }
};
