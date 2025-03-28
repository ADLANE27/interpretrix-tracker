
// Constants for configuration
export const RETRY_MAX = 15; // Reduced from 20 to be more reasonable
export const RETRY_DELAY_BASE = 1000; // Increased from 500ms for better backoff
export const CONNECTION_TIMEOUT = 20000; // Increased from 15000ms
export const EVENT_COOLDOWN = 100; // Increased from 50ms to reduce event floods

// Health check constants
export const HEALTH_CHECK_INTERVAL = 5000; // Increased from 3000ms for less frequent checks
export const HEARTBEAT_INTERVAL = 15000; // Increased from 10000ms
export const HEARTBEAT_TIMEOUT = 20000; // Increased from 15000ms

// Connection status change debounce to prevent UI flickering
export const CONNECTION_STATUS_DEBOUNCE_TIME = 500; // Increased from 150ms

// Staggered reconnection parameters
export const RECONNECT_STAGGER_INTERVAL = 100; // Increased from 30ms
export const RECONNECT_STAGGER_MAX_DELAY = 1000; // Increased from 500ms

// Periodic reconnection interval (in milliseconds)
export const RECONNECT_PERIODIC_INTERVAL = 60000; // Increased from 30000ms for less frequent attempts

// Telemetry and debugging
export const DEBUG_MODE = true;
export const TELEMETRY_BATCH_SIZE = 10;
export const TELEMETRY_INTERVAL = 60000;

// Status update-specific constants
export const STATUS_UPDATE_DEBOUNCE = 50; // Increased from 10ms for status updates
export const STATUS_EVENT_PRIORITY = true; // Flag to indicate status events should be prioritized
