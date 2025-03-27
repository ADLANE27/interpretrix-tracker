
// Constants for configuration
export const RETRY_MAX = 20; 
export const RETRY_DELAY_BASE = 1000; // Reduced for faster reconnections
export const CONNECTION_TIMEOUT = 20000; // Reduced from 30000ms
export const EVENT_COOLDOWN = 100; // Reduced from 200ms for faster response

// Health check constants
export const HEALTH_CHECK_INTERVAL = 5000; // Reduced from 10000ms for more frequent checks
export const HEARTBEAT_INTERVAL = 15000; // Reduced from 20000ms
export const HEARTBEAT_TIMEOUT = 20000; // Reduced from 30000ms

// Connection status change debounce to prevent UI flickering
export const CONNECTION_STATUS_DEBOUNCE_TIME = 300; // Reduced from 800ms

// Staggered reconnection parameters
export const RECONNECT_STAGGER_INTERVAL = 50; // Reduced from 100ms
export const RECONNECT_STAGGER_MAX_DELAY = 1000; // Reduced from 2000ms

// Periodic reconnection interval (in milliseconds)
export const RECONNECT_PERIODIC_INTERVAL = 40000; // Reduced from 60000ms

// Telemetry and debugging
export const DEBUG_MODE = true;
export const TELEMETRY_BATCH_SIZE = 10;
export const TELEMETRY_INTERVAL = 60000;

// Status update-specific constants
export const STATUS_UPDATE_DEBOUNCE = 50; // Very low debounce for status updates
export const STATUS_EVENT_PRIORITY = true; // Flag to indicate status events should be prioritized
