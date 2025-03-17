
export const CONNECTION_CONSTANTS = {
  MAX_RECONNECT_ATTEMPTS: 10,
  BASE_RECONNECT_DELAY: 2000,
  HEARTBEAT_TIMEOUT: 60000,
  HEARTBEAT_INTERVAL: 30000, // Reduced from 45000 to detect issues faster
  PRESENCE_VALIDATION_DELAY: 2000,
  SESSION_CHECK_INTERVAL: 60000,
  SUBSCRIPTION_TIMEOUT: 8000, // Added subscription timeout
  MESSAGE_QUEUE_LIMIT: 50,    // Added queue limit
  CHANNEL_PREFIX: 'chat',     // Added channel prefix for consistency
  RECONNECT_JITTER: 1000      // Added jitter to prevent thundering herd
} as const;
