
// Constants for configuration
export const RETRY_MAX = 20; 
export const RETRY_DELAY_BASE = 300; // Reduced for faster reconnections
export const CONNECTION_TIMEOUT = 10000; // Reduced for faster timeout detection
export const EVENT_COOLDOWN = 20; // Reduced for faster response

// Health check constants
export const HEALTH_CHECK_INTERVAL = 2000; // Reduced for more frequent checks
export const HEARTBEAT_INTERVAL = 8000; // Reduced for faster heartbeat
export const HEARTBEAT_TIMEOUT = 10000; // Reduced for faster timeout detection

// Connection status change debounce to prevent UI flickering
export const CONNECTION_STATUS_DEBOUNCE_TIME = 100; // Reduced for faster UI updates

// Staggered reconnection parameters
export const RECONNECT_STAGGER_INTERVAL = 20; // Reduced for faster staggered reconnections
export const RECONNECT_STAGGER_MAX_DELAY = 300; // Reduced for faster max delay

// Periodic reconnection interval (in milliseconds)
export const RECONNECT_PERIODIC_INTERVAL = 20000; // Reduced for more frequent reconnection attempts

// Telemetry and debugging
export const DEBUG_MODE = true;
export const TELEMETRY_BATCH_SIZE = 10;
export const TELEMETRY_INTERVAL = 60000;

// Status update-specific constants
export const STATUS_UPDATE_DEBOUNCE = 0; // Zero debounce for status updates for immediate updates
export const STATUS_EVENT_PRIORITY = true; // Flag to indicate status events should be prioritized
