
export const CONNECTION_CONSTANTS = {
  MAX_RECONNECT_ATTEMPTS: 10,
  BASE_RECONNECT_DELAY: 3000,
  HEARTBEAT_TIMEOUT: 60000,
  HEARTBEAT_INTERVAL: 45000, 
  PRESENCE_VALIDATION_DELAY: 3000,
  SESSION_CHECK_INTERVAL: 60000,
  // Add new constants for better debouncing
  CONNECTION_STATUS_DEBOUNCE: 1000, // Only emit connection status changes once per second
  STATUS_UPDATE_THROTTLE: 2000, // Minimum time between status update notifications
  LOG_LEVEL: 'warning' // Reduce logging level
} as const;
