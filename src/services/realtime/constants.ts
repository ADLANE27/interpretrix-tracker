
// Constants for configuration
export const RETRY_MAX = 20; // Increased from 15 to allow more retries
export const RETRY_DELAY_BASE = 1500; // Decreased from 2000ms for quicker initial retries
export const CONNECTION_TIMEOUT = 30000; // Reduced from 45000ms to detect problems earlier
export const EVENT_COOLDOWN = 200; // Reduced from 300ms for faster response

// Health check constants
export const HEALTH_CHECK_INTERVAL = 10000; // Reduced for more frequent checks
export const HEARTBEAT_INTERVAL = 20000; // Reduced for more frequent heartbeats
export const HEARTBEAT_TIMEOUT = 30000; // Reduced to detect timeout earlier

// Connection status change debounce to prevent UI flickering
export const CONNECTION_STATUS_DEBOUNCE_TIME = 800; // Reduced for faster UI updates

// Staggered reconnection parameters
export const RECONNECT_STAGGER_INTERVAL = 100; // Reduced for faster reconnection
export const RECONNECT_STAGGER_MAX_DELAY = 2000; // Reduced maximum stagger delay

// Periodic reconnection interval (in milliseconds)
export const RECONNECT_PERIODIC_INTERVAL = 60000; // Added this constant for periodic reconnection

// Telemetry and debugging
export const DEBUG_MODE = true; // Set to true to enable verbose logging
export const TELEMETRY_BATCH_SIZE = 10; // Number of events to batch before sending
export const TELEMETRY_INTERVAL = 60000; // How often to send telemetry in ms
