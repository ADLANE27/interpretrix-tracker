
/**
 * A simple event emitter implementation for browser environments
 */
export class CustomEventEmitter {
  private events: Record<string, Function[]> = {};

  /**
   * Register an event listener
   */
  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
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
   * (Compatibility with Node.js EventEmitter, ignored in this implementation)
   */
  setMaxListeners(n: number): void {
    // This is a no-op method for compatibility with Node.js EventEmitter
  }
}
