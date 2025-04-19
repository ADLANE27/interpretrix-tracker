
/**
 * A utility class to prevent duplicate event processing
 */
export class EventDebouncer {
  private processedEvents: Map<string, number> = new Map();
  private debounceInterval: number = 300; // ms
  private cleanupInterval: number | null = null;
  private maxEvents: number = 1000;
  private pendingDebounces: Map<string, NodeJS.Timeout> = new Map();

  constructor(debounceInterval = 300, maxEvents = 1000) {
    this.debounceInterval = debounceInterval;
    this.maxEvents = maxEvents;
    
    // Set up cleanup to prevent memory leaks
    this.startCleanupInterval();
  }

  /**
   * Determines if an event should be processed based on its ID and timestamp
   */
  public shouldProcessEvent(eventId: string, timestamp?: number): boolean {
    const now = timestamp || Date.now();
    
    // Check if we've seen this event recently
    if (this.processedEvents.has(eventId)) {
      const lastProcessed = this.processedEvents.get(eventId)!;
      
      // If it was processed within the debounce interval, skip it
      if (now - lastProcessed < this.debounceInterval) {
        return false;
      }
    }
    
    // Record this event
    this.processedEvents.set(eventId, now);
    
    // If we're tracking too many events, clean up old ones
    if (this.processedEvents.size > this.maxEvents) {
      this.cleanup(now);
    }
    
    return true;
  }

  /**
   * Execute a function after a delay, canceling any pending execution with the same ID
   */
  public debounce(
    callback: () => void, 
    id: string, 
    delay: number = this.debounceInterval
  ): void {
    // Clear any existing timeout with this ID
    if (this.pendingDebounces.has(id)) {
      clearTimeout(this.pendingDebounces.get(id)!);
      this.pendingDebounces.delete(id);
    }
    
    // Set a new timeout
    const timeoutId = setTimeout(() => {
      callback();
      this.pendingDebounces.delete(id);
    }, delay);
    
    // Store the timeout ID
    this.pendingDebounces.set(id, timeoutId);
  }

  /**
   * Cleans up events older than the debounce interval
   */
  private cleanup(now?: number): void {
    const currentTime = now || Date.now();
    const expiryTime = currentTime - this.debounceInterval;
    
    // Delete events older than the debounce interval
    for (const [eventId, timestamp] of this.processedEvents.entries()) {
      if (timestamp < expiryTime) {
        this.processedEvents.delete(eventId);
      }
    }
  }

  /**
   * Starts the automatic cleanup interval
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval === null) {
      // Run cleanup every minute to keep memory usage low
      this.cleanupInterval = window.setInterval(() => {
        this.cleanup();
      }, 60000);
    }
  }

  /**
   * Stops the automatic cleanup interval
   */
  public dispose(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clear all pending debounces
    for (const timeoutId of this.pendingDebounces.values()) {
      clearTimeout(timeoutId);
    }
    this.pendingDebounces.clear();
    this.processedEvents.clear();
  }
}
