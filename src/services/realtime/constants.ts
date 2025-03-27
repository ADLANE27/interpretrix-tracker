
// Constants for configuration
export const RETRY_MAX = 15; // Increased from 10 to allow more retries
export const RETRY_DELAY_BASE = 2000; // Adjusted from 3000ms to 2000ms for quicker initial retries
export const CONNECTION_TIMEOUT = 45000; // Reduced from 60000ms to detect problems earlier
export const EVENT_COOLDOWN = 300; // Reduced from 500ms for faster response

// Health check constants
export const HEALTH_CHECK_INTERVAL = 15000; // Reduced from 30000ms for more frequent checks
export const HEARTBEAT_INTERVAL = 30000; // Reduced from 45000ms for more frequent heartbeats
export const HEARTBEAT_TIMEOUT = 45000; // Reduced from 60000ms to detect timeout earlier

// Connection status change debounce to prevent UI flickering
export const CONNECTION_STATUS_DEBOUNCE_TIME = 1000; // 1 second debounce for UI updates

// Staggered reconnection parameters
export const RECONNECT_STAGGER_INTERVAL = 150; // ms between channel reconnections
export const RECONNECT_STAGGER_MAX_DELAY = 3000; // maximum stagger delay
