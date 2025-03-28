
// Event types
export const EVENT_CONNECTION_ESTABLISHED = 'connection-established';
export const EVENT_CONNECTION_LOST = 'connection-lost';

// Pattern used for detecting mentions in messages
export const MENTION_PATTERN = /@([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*)/g;

// Constants used in the realtime subscription process
export const REALTIME_SUBSCRIPTION_STATES = {
  SUBSCRIBED: 'SUBSCRIBED',
  TIMED_OUT: 'TIMED_OUT',
  CLOSED: 'CLOSED',
  CHANNEL_ERROR: 'CHANNEL_ERROR'
};

// Standard reconnect parameters
export const RECONNECT_BASE_DELAY_MS = 1000;
export const MAX_RECONNECT_ATTEMPTS = 5;

// Channel names
export const CHANNEL_PREFIX = {
  MESSAGE: 'message-channel-',
  CHAT: 'chat-',
  INTERPRETER: 'interpreter-',
  MISSION: 'mission-',
  TERMINOLOGY: 'terminology-'
};
