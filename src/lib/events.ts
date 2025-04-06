
import { CustomEventEmitter } from './customEventEmitter';

// Event types
export const EVENT_INTERPRETER_STATUS_UPDATE = 'interpreter-status-update';
export const EVENT_UNREAD_MENTIONS_UPDATED = 'unread-mentions-updated';
export const EVENT_NEW_MESSAGE_RECEIVED = 'new-message-received';
export const EVENT_CONNECTION_STATUS_CHANGE = 'connection-status-change';
export const EVENT_NOTIFICATION_SETTINGS_UPDATED = 'notification-settings-updated';
export const EVENT_MISSION_STATUS_UPDATE = 'mission-status-update';

// Create an event emitter instance
export const eventEmitter = new CustomEventEmitter();

// Set max listeners to avoid memory leak warnings
// Status updates need more listeners due to the number of interpreter cards
eventEmitter.setMaxListeners(100);

// Time window for deduping events (in ms)
export const EVENT_DEDUPE_WINDOW = 500;

// Store processed event IDs to avoid duplicate handling
const processedEvents = new Map<string, number>();

// Helper to check if an event should be processed (to prevent duplicates)
export const shouldProcessEvent = (eventId: string, eventType: string): boolean => {
  const key = `${eventType}-${eventId}`;
  const now = Date.now();
  const lastProcessed = processedEvents.get(key);
  
  if (lastProcessed && now - lastProcessed < EVENT_DEDUPE_WINDOW) {
    return false;
  }
  
  // Mark event as processed
  processedEvents.set(key, now);
  
  // Clean up old entries every 100 events
  if (processedEvents.size > 500) {
    const keysToDelete: string[] = [];
    processedEvents.forEach((timestamp, eventKey) => {
      if (now - timestamp > 5000) { // 5 seconds retention
        keysToDelete.push(eventKey);
      }
    });
    keysToDelete.forEach(key => processedEvents.delete(key));
  }
  
  return true;
};
