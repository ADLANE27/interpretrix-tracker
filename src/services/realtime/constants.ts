
// Constants for configuration
export const RETRY_MAX = 15; 
export const RETRY_DELAY_BASE = 1000; 
export const CONNECTION_TIMEOUT = 20000; 
export const EVENT_COOLDOWN = 300; // Increased from 100ms to reduce interference with message sending operations

// Health check constants
export const HEALTH_CHECK_INTERVAL = 5000;
export const HEARTBEAT_INTERVAL = 15000;
export const HEARTBEAT_TIMEOUT = 20000;

// Connection status change debounce to prevent UI flickering
export const CONNECTION_STATUS_DEBOUNCE_TIME = 500;

// Staggered reconnection parameters
export const RECONNECT_STAGGER_INTERVAL = 100;
export const RECONNECT_STAGGER_MAX_DELAY = 1000;

// Periodic reconnection interval (in milliseconds)
export const RECONNECT_PERIODIC_INTERVAL = 60000;

// Telemetry and debugging
export const DEBUG_MODE = true;
export const TELEMETRY_BATCH_SIZE = 10;
export const TELEMETRY_INTERVAL = 60000;

// Status update-specific constants
export const STATUS_UPDATE_DEBOUNCE = 50;
export const STATUS_EVENT_PRIORITY = true;

// Mentions specific constants
export const MENTION_PATTERN = /@([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*)/g;
export const MENTION_MAX_LENGTH = 50; // Maximum length of a mention string
