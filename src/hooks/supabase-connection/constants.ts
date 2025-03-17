
export const CONNECTION_CONSTANTS = {
  MAX_RECONNECT_ATTEMPTS: 15,        // Increased from 10
  BASE_RECONNECT_DELAY: 1000,        // Reduced from 2000
  HEARTBEAT_TIMEOUT: 30000,          // Reduced from 60000
  HEARTBEAT_INTERVAL: 15000,         // Reduced from 45000
  PRESENCE_VALIDATION_DELAY: 2000,
  SESSION_CHECK_INTERVAL: 30000      // Reduced from 60000
} as const;
