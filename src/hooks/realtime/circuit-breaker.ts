
/**
 * Circuit breaker pattern implementation for realtime functionality
 * Used to prevent repeated failed calls to enable realtime functionality
 */

// Circuit breaker state to prevent repeated failed calls
const circuitBreakerState = {
  isOpen: false,
  failureCount: 0,
  lastFailureTime: 0,
  resetTimeout: 30000, // 30 seconds before trying again
  failureThreshold: 3
};

/**
 * Reset circuit breaker state for fresh start
 */
export const resetCircuitBreaker = (): void => {
  circuitBreakerState.isOpen = false;
  circuitBreakerState.failureCount = 0;
  circuitBreakerState.lastFailureTime = 0;
  console.log('[CircuitBreaker] Reset successful');
};

/**
 * Check if the circuit breaker is currently open
 */
export const isCircuitBreakerOpen = (): boolean => {
  if (circuitBreakerState.isOpen) {
    const now = Date.now();
    const timeSinceLastFailure = now - circuitBreakerState.lastFailureTime;
    
    // Auto-reset if enough time has passed
    if (timeSinceLastFailure > circuitBreakerState.resetTimeout) {
      resetCircuitBreaker();
      return false;
    }
    
    return true;
  }
  
  return false;
};

/**
 * Record a failure in the circuit breaker
 * Returns whether the circuit breaker is now open
 */
export const recordFailure = (): boolean => {
  circuitBreakerState.failureCount++;
  circuitBreakerState.lastFailureTime = Date.now();
  
  if (circuitBreakerState.failureCount >= circuitBreakerState.failureThreshold) {
    circuitBreakerState.isOpen = true;
    return true;
  }
  
  return false;
};

/**
 * Record a success in the circuit breaker
 */
export const recordSuccess = (): void => {
  circuitBreakerState.failureCount = 0;
  circuitBreakerState.isOpen = false;
};
