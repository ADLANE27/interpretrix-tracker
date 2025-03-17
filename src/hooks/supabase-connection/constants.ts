
export const CONNECTION_CONSTANTS = {
  MAX_RECONNECT_ATTEMPTS: 20,        // Increased from 15
  BASE_RECONNECT_DELAY: 800,         // Reduced from 1000
  HEARTBEAT_TIMEOUT: 30000,          // Kept the same
  HEARTBEAT_INTERVAL: 15000,         // Kept the same
  PRESENCE_VALIDATION_DELAY: 2000,   // Kept the same
  SESSION_CHECK_INTERVAL: 30000      // Kept the same
} as const;
