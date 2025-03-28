
/**
 * Simple EventEmitter implementation for browser environments
 */
export class EventEmitter {
  private events: Record<string, Array<(...args: any[]) => void>> = {};

  /**
   * Register an event handler
   */
  on(event: string, listener: (...args: any[]) => void): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    
    this.events[event].push(listener);
    
    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  /**
   * Remove an event handler
   */
  off(event: string, listener: (...args: any[]) => void): void {
    if (!this.events[event]) {
      return;
    }
    
    const idx = this.events[event].indexOf(listener);
    if (idx >= 0) {
      this.events[event].splice(idx, 1);
    }
  }

  /**
   * Emit an event with arguments
   */
  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) {
      return;
    }
    
    // Create a copy of the listeners array to avoid issues if handlers modify the array
    const listeners = [...this.events[event]];
    
    listeners.forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}
