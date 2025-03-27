
// Constants for configuration
export const RETRY_MAX = 20; 
export const RETRY_DELAY_BASE = 500; // Further reduced for faster reconnections
export const CONNECTION_TIMEOUT = 10000; // Reduced for faster timeout detection
export const EVENT_COOLDOWN = 10; // Dramatically reduced from 100ms for near-instant response

// Health check constants
export const HEALTH_CHECK_INTERVAL = 3000; // More frequent health checks
export const HEARTBEAT_INTERVAL = 10000; // More frequent heartbeats
export const HEARTBEAT_TIMEOUT = 15000; // Shorter timeout for heartbeats

// Connection status change debounce to prevent UI flickering
export const CONNECTION_STATUS_DEBOUNCE_TIME = 150; // Reduced from 300ms

// Staggered reconnection parameters
export const RECONNECT_STAGGER_INTERVAL = 25; // Reduced for faster reconnections
export const RECONNECT_STAGGER_MAX_DELAY = 500; // Reduced max delay

// Periodic reconnection interval (in milliseconds)
export const RECONNECT_PERIODIC_INTERVAL = 30000; // More frequent periodic reconnections

// Telemetry and debugging
export const DEBUG_MODE = true;
export const TELEMETRY_BATCH_SIZE = 10;
export const TELEMETRY_INTERVAL = 60000;

// Status update-specific constants
export const STATUS_UPDATE_DEBOUNCE = 10; // Extremely low debounce for status updates
export const STATUS_EVENT_PRIORITY = true; // Flag to indicate status events should be prioritized
