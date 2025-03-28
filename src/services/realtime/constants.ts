
// Constants for configuration
export const RETRY_MAX = 15; // Maximum number of retry attempts
export const RETRY_DELAY_BASE = 2000; // Base delay in milliseconds (increased for better backoff)
export const CONNECTION_TIMEOUT = 30000; // Connection timeout in milliseconds
export const EVENT_COOLDOWN = 250; // Event cooldown period to reduce event floods

// Health check constants
export const HEALTH_CHECK_INTERVAL = 15000; // Health check interval in milliseconds
export const HEARTBEAT_INTERVAL = 30000; // Heartbeat interval in milliseconds
export const HEARTBEAT_TIMEOUT = 45000; // Heartbeat timeout in milliseconds

// Connection status change debounce to prevent UI flickering
export const CONNECTION_STATUS_DEBOUNCE_TIME = 1000; 

// Staggered reconnection parameters
export const RECONNECT_STAGGER_INTERVAL = 500;
export const RECONNECT_STAGGER_MAX_DELAY = 3000;

// Periodic reconnection interval (in milliseconds)
export const RECONNECT_PERIODIC_INTERVAL = 60000;

// Telemetry and debugging
export const DEBUG_MODE = false; // Disable verbose logging in production
export const TELEMETRY_BATCH_SIZE = 10;
export const TELEMETRY_INTERVAL = 60000;

// Status update-specific constants
export const STATUS_UPDATE_DEBOUNCE = 200;
export const STATUS_EVENT_PRIORITY = true; // Flag to indicate status events should be prioritized
