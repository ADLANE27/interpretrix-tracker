
/**
 * A simple event emitter implementation that supports TypeScript.
 */
export class CustomEventEmitter {
  private events: { [key: string]: Array<(...args: any[]) => void> } = {};
  private maxListeners: number = 10;

  /**
   * Register an event listener
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    
    this.events[event].push(listener);
    
    // Warn if we have too many listeners
    if (this.events[event].length > this.maxListeners) {
      console.warn(`[EventEmitter] Possible memory leak detected. ${this.events[event].length} listeners added for event '${event}'.`);
    }
  }

  /**
   * Remove an event listener
   */
  public off(event: string, listenerToRemove: (...args: any[]) => void): void {
    if (!this.events[event]) {
      return;
    }
    
    this.events[event] = this.events[event].filter(listener => listener !== listenerToRemove);
    
    // Clean up the array if it's empty
    if (this.events[event].length === 0) {
      delete this.events[event];
    }
  }

  /**
   * Emit an event
   */
  public emit(event: string, ...args: any[]): void {
    if (!this.events[event]) {
      return;
    }
    
    // Clone the listeners array to avoid issues if listeners are added/removed during emission
    const listeners = [...this.events[event]];
    
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`[EventEmitter] Error in listener for event '${event}':`, error);
      }
    });
  }

  /**
   * Set the maximum number of listeners per event
   */
  public setMaxListeners(n: number): void {
    this.maxListeners = n;
  }
}
