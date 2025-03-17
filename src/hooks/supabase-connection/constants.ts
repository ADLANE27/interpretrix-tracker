
export const CONNECTION_CONSTANTS = {
  // Decrease base delay for faster initial reconnect attempts
  BASE_RECONNECT_DELAY: 250, // 250ms for faster recovery
  
  // Maximum reconnection attempts before giving up
  MAX_RECONNECT_ATTEMPTS: 15, // Increased from 10
  
  // Maximum delay between reconnect attempts (capped at 10 seconds)
  MAX_RECONNECT_DELAY: 5000, // Reduced from 10000 to reconnect faster
  
  // Default message fetch limit per page
  MESSAGE_FETCH_LIMIT: 30,
  
  // Connection monitoring interval (check connection every 30s)
  CONNECTION_CHECK_INTERVAL: 30000,
  
  // Heartbeat interval for presence (15 seconds)
  PRESENCE_HEARTBEAT_INTERVAL: 10000, // Reduced from 15000
  
  // Additional constants needed for the implementation:
  PRESENCE_VALIDATION_DELAY: 2000,
  SESSION_CHECK_INTERVAL: 60000,
  HEARTBEAT_INTERVAL: 15000,
  HEARTBEAT_TIMEOUT: 30000,
  
  // Offline message handling
  OFFLINE_MESSAGE_QUEUE_SIZE: 50,
  
  // Incremental update handling
  INITIAL_FETCH_LIMIT: 30,
  LOAD_MORE_FETCH_LIMIT: 20
};
