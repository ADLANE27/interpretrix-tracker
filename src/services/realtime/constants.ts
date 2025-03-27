
// Constants for configuration
export const RETRY_MAX = 20; 
export const RETRY_DELAY_BASE = 500; // Reduced for faster reconnections
export const CONNECTION_TIMEOUT = 15000; // Reduced from 20000ms
export const EVENT_COOLDOWN = 50; // Reduced from 100ms for faster response

// Health check constants
export const HEALTH_CHECK_INTERVAL = 3000; // Reduced from 5000ms for more frequent checks
export const HEARTBEAT_INTERVAL = 10000; // Reduced from 15000ms
export const HEARTBEAT_TIMEOUT = 15000; // Reduced from 20000ms

// Connection status change debounce to prevent UI flickering
export const CONNECTION_STATUS_DEBOUNCE_TIME = 150; // Reduced from 300ms

// Staggered reconnection parameters
export const RECONNECT_STAGGER_INTERVAL = 30; // Reduced from 50ms
export const RECONNECT_STAGGER_MAX_DELAY = 500; // Reduced from 1000ms

// Periodic reconnection interval (in milliseconds)
export const RECONNECT_PERIODIC_INTERVAL = 30000; // Reduced from 40000ms

// Telemetry and debugging
export const DEBUG_MODE = true;
export const TELEMETRY_BATCH_SIZE = 10;
export const TELEMETRY_INTERVAL = 60000;

// Status update-specific constants
export const STATUS_UPDATE_DEBOUNCE = 10; // Extremely low debounce for status updates
export const STATUS_EVENT_PRIORITY = true; // Flag to indicate status events should be prioritized
