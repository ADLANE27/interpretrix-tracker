
export const CONNECTION_CONSTANTS = {
  // Decrease base delay for faster initial reconnect attempts
  BASE_RECONNECT_DELAY: 500, // 500ms instead of the typical 1000ms
  
  // Maximum reconnection attempts before giving up
  MAX_RECONNECT_ATTEMPTS: 10,
  
  // Maximum delay between reconnect attempts (capped at 10 seconds)
  MAX_RECONNECT_DELAY: 10000,
  
  // Default message fetch limit per page
  MESSAGE_FETCH_LIMIT: 30,
  
  // Connection monitoring interval (check connection every 30s)
  CONNECTION_CHECK_INTERVAL: 30000,
  
  // Heartbeat interval for presence (15 seconds)
  PRESENCE_HEARTBEAT_INTERVAL: 15000
};
