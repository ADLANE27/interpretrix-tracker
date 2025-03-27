
// Constants for configuration
export const RETRY_MAX = 10;
export const RETRY_DELAY_BASE = 3000; // Increased from 2000ms to 3000ms
export const CONNECTION_TIMEOUT = 60000; // Increased from 30000ms to 60000ms
export const EVENT_COOLDOWN = 500; // ms

// Health check constants
export const HEALTH_CHECK_INTERVAL = 30000; // Check connection health every 30 seconds
export const HEARTBEAT_INTERVAL = 45000; // Send heartbeat every 45 seconds
export const HEARTBEAT_TIMEOUT = 60000; // Consider connection dead after 60 seconds without response
