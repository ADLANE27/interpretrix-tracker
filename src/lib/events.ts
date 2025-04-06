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

// Time window for deduping events (in ms) - increased from 1500ms to 3000ms
export const EVENT_DEDUPE_WINDOW = 3000;

// Store processed event IDs to avoid duplicate handling
// Changed from Map to a more complex structure to track both UUID and status
const processedEvents = new Map<string, {timestamp: number, status?: string, uuid?: string, source?: string}>();

// Helper to check if an event should be processed (to prevent duplicates)
// Enhanced to check both event ID and status value and source
export const shouldProcessEvent = (eventId: string, eventType: string, status?: string, uuid?: string, source?: string): boolean => {
  const key = `${eventType}-${eventId}`;
  const now = Date.now();
  const lastProcessed = processedEvents.get(key);

  // If we already processed this exact event (matching uuid or matching status)
  if (lastProcessed) {
    // If UUIDs match, this is definitely a duplicate
    if (uuid && lastProcessed.uuid === uuid) {
      console.log(`[Events] Duplicate event with same UUID detected: ${uuid}`);
      return false;
    }
    
    // If source matches and we're within the dedupe window, it's likely a duplicate
    if (source && lastProcessed.source === source && now - lastProcessed.timestamp < EVENT_DEDUPE_WINDOW) {
      console.log(`[Events] Duplicate from same source detected: ${source}`);
      return false;
    }
    
    // If status matches and we're in the debounce window, treat as duplicate
    if (status && lastProcessed.status === status && now - lastProcessed.timestamp < EVENT_DEDUPE_WINDOW) {
      console.log(`[Events] Duplicate status update detected: ${status}`);
      return false;
    }
    
    // Otherwise, if we're in the normal debounce window, don't process
    if (now - lastProcessed.timestamp < EVENT_DEDUPE_WINDOW / 2) {  // Use shorter window for general deduplication
      return false;
    }
  }
  
  // Mark event as processed with additional metadata
  processedEvents.set(key, {
    timestamp: now,
    status,
    uuid,
    source
  });
  
  // Clean up old entries every 100 events
  if (processedEvents.size > 500) {
    const keysToDelete: string[] = [];
    processedEvents.forEach((data, eventKey) => {
      if (now - data.timestamp > 30000) { // 30 seconds retention (increased from 10s)
        keysToDelete.push(eventKey);
      }
    });
    keysToDelete.forEach(key => processedEvents.delete(key));
  }
  
  return true;
};
