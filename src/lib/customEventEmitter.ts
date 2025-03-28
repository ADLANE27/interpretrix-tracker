/**
 * A custom event emitter with enhanced features for deduplication and named handlers
 */
export class CustomEventEmitter {
  private events: Map<string, Map<string, Function>> = new Map();
  private maxListeners: number = 10;
  private lastEmittedEvents: Map<string, { time: number, value: any }> = new Map();
  private listenersCount: Map<string, number> = new Map();
  private warnedEvents: Set<string> = new Set();
  
  constructor() {
    // Initialize the event map
  }
  
  /**
   * Set the maximum number of listeners for a single event
   */
  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }
  
  /**
   * Register an event listener with an optional handler key for identification
   */
  on(event: string, listener: Function, handlerKey: string = ''): this {
    // Create event map if it doesn't exist
    if (!this.events.has(event)) {
      this.events.set(event, new Map());
      this.listenersCount.set(event, 0);
    }
    
    const eventMap = this.events.get(event)!;
    const key = handlerKey || `listener_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // If the same handler key already exists, replace it instead of adding a new one
    if (handlerKey && eventMap.has(handlerKey)) {
      eventMap.set(handlerKey, listener);
      return this;
    }
    
    // Count listeners properly
    const currentCount = this.listenersCount.get(event) || 0;
    this.listenersCount.set(event, currentCount + 1);
    
    // Check if we're exceeding max listeners (but only warn once per event)
    if (currentCount >= this.maxListeners && !this.warnedEvents.has(event)) {
      console.warn(`[CustomEventEmitter] Possible memory leak detected. ${currentCount} listeners added for event: ${event}`);
      this.warnedEvents.add(event);
    }
    
    // Add the listener with its key
    eventMap.set(key, listener);
    
    return this;
  }
  
  /**
   * Remove an event listener, optionally by handler key
   */
  off(event: string, listener: Function, handlerKey?: string): this {
    const eventMap = this.events.get(event);
    
    if (!eventMap) return this;
    
    let removed = false;
    
    if (handlerKey) {
      // If handler key is provided, remove that specific handler
      removed = eventMap.delete(handlerKey);
    } else {
      // Otherwise, find and remove the listener by comparing functions
      for (const [key, registeredListener] of eventMap.entries()) {
        if (registeredListener === listener) {
          eventMap.delete(key);
          removed = true;
          break;
        }
      }
    }
    
    // Update listener count
    if (removed) {
      const currentCount = this.listenersCount.get(event) || 0;
      this.listenersCount.set(event, Math.max(0, currentCount - 1));
      
      // If we're back under the limit, remove from warned set
      if (currentCount <= this.maxListeners && this.warnedEvents.has(event)) {
        this.warnedEvents.delete(event);
      }
    }
    
    // Clean up empty event maps
    if (eventMap.size === 0) {
      this.events.delete(event);
      this.listenersCount.delete(event);
    }
    
    return this;
  }
  
  /**
   * Emit an event with arguments, with deduplication option
   */
  emit(event: string, ...args: any[]): boolean {
    // Check if we should deduplicate this event
    const shouldDeduplicate = event.includes('connection') || event.includes('status');
    
    if (shouldDeduplicate) {
      const eventKey = `${event}-${JSON.stringify(args)}`;
      const now = Date.now();
      const lastEmitted = this.lastEmittedEvents.get(eventKey);
      
      // Deduplicate frequent identical events (for connection status, etc)
      if (lastEmitted && now - lastEmitted.time < 1000 && 
          JSON.stringify(lastEmitted.value) === JSON.stringify(args)) {
        return false; // Skip duplicate event emission
      }
      
      // Update last emitted
      this.lastEmittedEvents.set(eventKey, { time: now, value: args });
      
      // Cleanup old entries periodically
      if (this.lastEmittedEvents.size > 100) {
        const keysToDelete: string[] = [];
        this.lastEmittedEvents.forEach((value, key) => {
          if (now - value.time > 60000) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach(key => this.lastEmittedEvents.delete(key));
      }
    }
    
    const eventMap = this.events.get(event);
    
    if (!eventMap) return false;
    
    // Call all registered listeners
    for (const listener of eventMap.values()) {
      try {
        listener(...args);
      } catch (error) {
        console.error(`[CustomEventEmitter] Error in event listener for: ${event}`, error);
      }
    }
    
    return true;
  }
  
  /**
   * Remove all listeners for a specific event or all events
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
      this.listenersCount.delete(event);
      this.warnedEvents.delete(event);
    } else {
      this.events.clear();
      this.listenersCount.clear();
      this.warnedEvents.clear();
    }
    
    return this;
  }
  
  /**
   * Get the number of listeners for a specific event
   */
  listenerCount(event: string): number {
    return this.listenersCount.get(event) || 0;
  }
  
  /**
   * Reset warnings for an event
   */
  resetWarnings(event?: string): void {
    if (event) {
      this.warnedEvents.delete(event);
    } else {
      this.warnedEvents.clear();
    }
  }
}
