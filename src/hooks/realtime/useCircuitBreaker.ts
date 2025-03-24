
import { useCallback } from 'react';
import { CircuitBreakerState } from './types';

// Circuit breaker state to prevent repeated failed calls
const circuitBreakerState: CircuitBreakerState = {
  isOpen: false,
  failureCount: 0,
  lastFailureTime: 0,
  resetTimeout: 60000, // Increase to 60 seconds before trying again
  failureThreshold: 5  // Increased threshold to avoid early tripping
};

export const useCircuitBreaker = (debugMode: boolean = false) => {
  const log = useCallback((message: string, ...args: any[]) => {
    if (debugMode) {
      console.log(`[CircuitBreaker] ${message}`, ...args);
    }
  }, [debugMode]);

  const isCircuitOpen = useCallback(() => {
    if (circuitBreakerState.isOpen) {
      const now = Date.now();
      const timeSinceLastFailure = now - circuitBreakerState.lastFailureTime;
      
      // If enough time has passed, reset the circuit breaker
      if (timeSinceLastFailure > circuitBreakerState.resetTimeout) {
        log(`Circuit breaker reset after ${timeSinceLastFailure}ms`);
        circuitBreakerState.isOpen = false;
        circuitBreakerState.failureCount = 0;
        return false;
      }
      
      log(`Circuit breaker is open, skipping operation`);
      return true;
    }
    
    return false;
  }, [log]);

  const recordSuccess = useCallback(() => {
    // Reset circuit breaker on success
    circuitBreakerState.failureCount = 0;
    circuitBreakerState.isOpen = false;
  }, []);

  const recordFailure = useCallback(() => {
    // Update circuit breaker on failure
    circuitBreakerState.failureCount++;
    circuitBreakerState.lastFailureTime = Date.now();
    
    if (circuitBreakerState.failureCount >= circuitBreakerState.failureThreshold) {
      circuitBreakerState.isOpen = true;
      console.error(`[CircuitBreaker] Circuit opened after ${circuitBreakerState.failureCount} failures`);
    }
  }, []);

  return {
    isCircuitOpen,
    recordSuccess,
    recordFailure
  };
};
