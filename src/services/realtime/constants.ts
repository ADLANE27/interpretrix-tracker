
// Constants for configuration
export const RETRY_MAX = 10; // Reduced from 15
export const RETRY_DELAY_BASE = 2000; // Increased from 1000
export const CONNECTION_TIMEOUT = 30000; // Increased from 20000
export const EVENT_COOLDOWN = 1000; // Increased from 250 to significantly reduce event floods

// Health check constants
export const HEALTH_CHECK_INTERVAL = 30000; // Less frequent health checks (from 10000)
export const HEARTBEAT_INTERVAL = 60000; // Increased from 30000
export const HEARTBEAT_TIMEOUT = 70000; // Increased from 40000

// Connection status change debounce to prevent UI flickering
export const CONNECTION_STATUS_DEBOUNCE_TIME = 5000; // Increased significantly to reduce UI chatter

// Staggered reconnection parameters
export const RECONNECT_STAGGER_INTERVAL = 1000; // Increased from 500
export const RECONNECT_STAGGER_MAX_DELAY = 5000; // Increased from 2000

// Periodic reconnection interval (in milliseconds)
export const RECONNECT_PERIODIC_INTERVAL = 300000; // Increased from 120000

// Telemetry and debugging
export const DEBUG_MODE = false; // Disable debug mode to reduce console noise
export const TELEMETRY_BATCH_SIZE = 20; // Increased from 10
export const TELEMETRY_INTERVAL = 120000; // Increased from 60000

// Status update-specific constants
export const STATUS_UPDATE_DEBOUNCE = 2000; // Increased from 1000
export const STATUS_EVENT_PRIORITY = true;
