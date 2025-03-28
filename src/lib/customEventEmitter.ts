
/**
 * A simple event emitter implementation for browser environments
 */
export class CustomEventEmitter {
  private events: Record<string, Function[]> = {};
  private maxListeners: number = 10;

  /**
   * Register an event listener
   */
  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    // Check if we're exceeding maxListeners and provide a warning
    if (this.events[event].length >= this.maxListeners) {
      console.warn(
        `[CustomEventEmitter] Possible memory leak detected. ${this.events[event].length} listeners added for event: ${event}`
      );
    }
    
    // Check if this exact listener is already registered to avoid duplicates
    if (!this.events[event].some(l => l === listener)) {
      this.events[event].push(listener);
    }
  }

  /**
   * Remove an event listener
   */
  off(event: string, listener: Function): void {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  /**
   * Emit an event with optional arguments
   */
  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events[event];
    if (!listeners || listeners.length === 0) return false;
    
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
    
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
    return this.events[event]?.length || 0;
  }
  
  /**
   * Remove all listeners for a specific event or all events
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events[event] = [];
    } else {
      this.events = {};
    }
  }
}
