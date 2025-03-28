
/**
 * A simple event emitter implementation for browser environments
 */
export class CustomEventEmitter {
  private events: Record<string, Function[]> = {};
  private maxListeners: number = 10;
  private duplicateWarnings: Set<string> = new Set();

  /**
   * Register an event listener
   */
  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    // Check for duplicate listeners to avoid memory leaks
    const isDuplicate = this.events[event].some(existingListener => 
      existingListener.toString() === listener.toString()
    );
    
    if (isDuplicate) {
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
    if (this.events[event].length >= this.maxListeners) {
      console.warn(
        `[CustomEventEmitter] Possible memory leak detected. ${this.events[event].length + 1} listeners added for event: ${event}. Current limit is ${this.maxListeners}.`
      );
    }
    
    this.events[event].push(listener);
    
    if (event === 'interpreter-status-update') {
      console.log(`[CustomEventEmitter] New listener registered for interpreter status updates. Total: ${this.events[event].length}`);
    }
  }

  /**
   * Remove an event listener
   */
  off(event: string, listener: Function): void {
    if (!this.events[event]) return;
    
    const initialLength = this.events[event].length;
    this.events[event] = this.events[event].filter(l => l !== listener);
    
    if (event === 'interpreter-status-update' && this.events[event].length !== initialLength) {
      console.log(`[CustomEventEmitter] Listener removed from interpreter status updates. Remaining: ${this.events[event].length}`);
    }
  }

  /**
   * Emit an event with optional arguments
   */
  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events[event];
    if (!listeners || listeners.length === 0) return false;
    
    if (event === 'interpreter-status-update') {
      console.log(`[CustomEventEmitter] Emitting interpreter status update to ${listeners.length} listeners`);
    }
    
    for (const listener of listeners) {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
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
    return this.events[event]?.length || 0;
  }
  
  /**
   * Remove all listeners for a specific event or all events
   */
  removeAllListeners(event?: string): void {
    if (event) {
      if (this.events[event]?.length > 0) {
        console.log(`[CustomEventEmitter] Removing all ${this.events[event].length} listeners for event: ${event}`);
      }
      this.events[event] = [];
    } else {
      // Log cleanup of important events
      if (this.events['interpreter-status-update']?.length > 0) {
        console.log(`[CustomEventEmitter] Removing all ${this.events['interpreter-status-update'].length} listeners for interpreter status updates in global cleanup`);
      }
      this.events = {};
    }
    
    // Clear the warnings cache on full cleanup
    if (!event) {
      this.duplicateWarnings.clear();
    }
  }
}
