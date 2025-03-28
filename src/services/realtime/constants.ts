
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

// Connection monitor constants
export const RETRY_MAX = 10;
export const RETRY_DELAY_BASE = 2000;
export const CONNECTION_TIMEOUT = 15000;
export const RECONNECT_STAGGER_INTERVAL = 500;
export const RECONNECT_STAGGER_MAX_DELAY = 10000;
export const RECONNECT_PERIODIC_INTERVAL = 60000;

// Debouncing and event handling constants
export const CONNECTION_STATUS_DEBOUNCE_TIME = 500;
export const EVENT_COOLDOWN = 1000;
export const STATUS_UPDATE_DEBOUNCE = 200;
export const DEBUG_MODE = false;
