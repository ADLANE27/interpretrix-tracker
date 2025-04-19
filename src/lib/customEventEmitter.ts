
/**
 * A simple event emitter implementation for browser environments
 * Optimized for performance with deduplication and rate limiting
 */
export class CustomEventEmitter {
  private events: Map<string, Set<Function>> = new Map();
  private maxListeners: number = 10;
  private duplicateWarnings: Set<string> = new Set();
  private emitTimestamps: Map<string, number> = new Map();
  private rateLimit: number = 50; // Milliseconds to throttle frequent events

  /**
   * Register an event listener
   */
  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    const listeners = this.events.get(event)!;
    
    // Check for duplicate listeners to avoid memory leaks
    // Use Set for O(1) lookups and automatic deduplication
    if (listeners.has(listener)) {
      const warningKey = `${event}-${listener.toString().substring(0, 50)}`;
      if (!this.duplicateWarnings.has(warningKey)) {
        console.warn(
          `[CustomEventEmitter] Duplicate listener detected for event: ${event}. This may cause memory leaks.`
        );
        this.duplicateWarnings.add(warningKey);
      }
      return; // Don't add the same listener twice
    }
    
    // Check if we're exceeding maxListeners and provide a warning
    if (listeners.size >= this.maxListeners) {
      console.warn(
        `[CustomEventEmitter] Possible memory leak detected. ${listeners.size + 1} listeners added for event: ${event}. Current limit is ${this.maxListeners}.`
      );
    }
    
    listeners.add(listener);
  }

  /**
   * Remove an event listener
   */
  off(event: string, listener: Function): void {
    if (!this.events.has(event)) return;
    
    const listeners = this.events.get(event)!;
    listeners.delete(listener);
    
    // Clean up empty listener sets
    if (listeners.size === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Emit an event with optional arguments
   * Returns true if the event had listeners, false otherwise
   */
  emit(event: string, ...args: any[]): boolean {
    if (!this.events.has(event)) return false;
    
    const listeners = this.events.get(event)!;
    if (listeners.size === 0) return false;
    
    // Rate limiting for high-frequency events
    const now = Date.now();
    const lastEmit = this.emitTimestamps.get(event) || 0;
    
    // Skip emissions that are too close together for non-critical events
    if (now - lastEmit < this.rateLimit && 
        (event.includes('status') || event.includes('update'))) {
      return true; // Return true so caller thinks it worked
    }
    
    this.emitTimestamps.set(event, now);
    
    try {
      // Use Array.from to avoid issues with listeners removing themselves during iteration
      const listenerArray = Array.from(listeners);
      for (const listener of listenerArray) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    } catch (e) {
      console.error(`Error emitting event ${event}:`, e);
    }
    
    return true;
  }

  /**
   * Set the maximum number of listeners for an event
   */
  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }
  
  /**
   * Get the current number of listeners for an event
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.size || 0;
  }
  
  /**
   * Remove all listeners for a specific event or all events
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    
    // Clear the warnings cache on full cleanup
    if (!event) {
      this.duplicateWarnings.clear();
      this.emitTimestamps.clear();
    }
  }
  
  /**
   * Set rate limit for event emissions (milliseconds)
   */
  setRateLimit(ms: number): void {
    this.rateLimit = ms;
  }
}
