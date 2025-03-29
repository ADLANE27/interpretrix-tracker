
/**
 * Constants for connection monitoring
 */
export const CONNECTION_CONSTANTS = {
  // Heartbeat interval in milliseconds
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  
  // Heartbeat timeout in milliseconds
  HEARTBEAT_TIMEOUT: 60000, // 60 seconds
  
  // Maximum number of retries before considering the connection as failed
  MAX_RETRIES: 5,
  
  // Base reconnect delay in milliseconds (will be multiplied by 2^retryCount for exponential backoff)
  BASE_RECONNECT_DELAY: 2000, // 2 seconds
  
  // Maximum number of reconnect attempts
  MAX_RECONNECT_ATTEMPTS: 5,
  
  // Delay for presence validation in milliseconds
  PRESENCE_VALIDATION_DELAY: 5000, // 5 seconds
  
  // Interval for session check in milliseconds
  SESSION_CHECK_INTERVAL: 300000 // 5 minutes
};
