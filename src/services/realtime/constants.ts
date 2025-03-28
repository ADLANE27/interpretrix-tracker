
// Constants for configuration
export const RETRY_MAX = 15;
export const RETRY_DELAY_BASE = 1000;
export const CONNECTION_TIMEOUT = 20000;
export const EVENT_COOLDOWN = 250; // Increased to reduce event floods

// Health check constants
export const HEALTH_CHECK_INTERVAL = 10000; // Less frequent health checks
export const HEARTBEAT_INTERVAL = 30000;
export const HEARTBEAT_TIMEOUT = 40000;

// Connection status change debounce to prevent UI flickering
export const CONNECTION_STATUS_DEBOUNCE_TIME = 2000; // Increased significantly to reduce UI chatter

// Staggered reconnection parameters
export const RECONNECT_STAGGER_INTERVAL = 500;
export const RECONNECT_STAGGER_MAX_DELAY = 2000;

// Periodic reconnection interval (in milliseconds)
export const RECONNECT_PERIODIC_INTERVAL = 120000;

// Telemetry and debugging
export const DEBUG_MODE = false; // Disable debug mode to reduce console noise
export const TELEMETRY_BATCH_SIZE = 10;
export const TELEMETRY_INTERVAL = 60000;

// Status update-specific constants
export const STATUS_UPDATE_DEBOUNCE = 1000; // Significantly increase debounce time for status updates
export const STATUS_EVENT_PRIORITY = true;
