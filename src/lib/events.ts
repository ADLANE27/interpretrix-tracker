
import mitt from 'mitt';
import { Profile } from '@/types/profile';

// Define event types
export const EVENT_INTERPRETER_STATUS_UPDATE = 'interpreter-status-update';
export const EVENT_UNREAD_MENTIONS_UPDATED = 'unread-mentions-updated';
export const EVENT_NEW_MESSAGE_RECEIVED = 'new-message-received';
export const EVENT_CONNECTION_STATUS_CHANGE = 'connection-status-change';
export const EVENT_INTERPRETER_BADGE_UPDATE = 'interpreter-badge-update';

// Create a typed event emitter
type Events = {
  [EVENT_INTERPRETER_STATUS_UPDATE]: { interpreterId: string, status: Profile['status'] };
  [EVENT_UNREAD_MENTIONS_UPDATED]: number;
  [EVENT_NEW_MESSAGE_RECEIVED]: any;
  [EVENT_CONNECTION_STATUS_CHANGE]: boolean;
  [EVENT_INTERPRETER_BADGE_UPDATE]: { interpreterId: string, status: Profile['status'] };
};

// Single event emitter instance for the entire application
export const eventEmitter = mitt<Events>();
