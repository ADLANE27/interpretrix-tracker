
import { STATUS_UPDATE_DEBOUNCE, EVENT_COOLDOWN } from './constants';
import { Profile } from '@/types/profile';
import { EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';

type EventCallback = {
  callback: Function;
  lastExecuted: number;
}

/**
 * Prevents event spam by debouncing events
 */
export class EventDebouncer {
  private eventTimeouts: Map<string, number> = new Map();
  private eventCallbacks: Map<string, EventCallback> = new Map();
  
  constructor() {
    console.log('[EventDebouncer] Initialized with STATUS_UPDATE_DEBOUNCE:', STATUS_UPDATE_DEBOUNCE);
  }

  /**
   * Debounces an event
   */
  public debounce(key: string, callback: Function, debounceTime?: number): void {
    // For status updates, use zero debounce time to ensure immediate propagation
    if (key.includes(EVENT_INTERPRETER_STATUS_UPDATE)) {
      debounceTime = 0;
    } else {
      // Use provided debounce time or default
      debounceTime = debounceTime !== undefined ? debounceTime : EVENT_COOLDOWN;
    }
    
    // Clear existing timeout
    const existingTimeout = this.eventTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Special case for status events - execute immediately AND set a timeout
    if (key.includes(EVENT_INTERPRETER_STATUS_UPDATE)) {
      // If it's a status update, execute immediately
      console.log(`[EventDebouncer] Executing status event immediately: ${key}`);
      callback();
      
      // Store last executed timestamp
      this.eventCallbacks.set(key, {
        callback,
        lastExecuted: Date.now()
      });
      
      return;
    }
    
    // For non-status events, use normal debouncing
    if (debounceTime <= 0) {
      // No debounce time means execute immediately
      callback();
      
      // Store last executed timestamp
      this.eventCallbacks.set(key, {
        callback,
        lastExecuted: Date.now()
      });
    } else {
      // Set timeout for debounced execution
      const timeout = window.setTimeout(() => {
        callback();
        this.eventTimeouts.delete(key);
        
        // Store last executed timestamp
        this.eventCallbacks.set(key, {
          callback,
          lastExecuted: Date.now()
        });
      }, debounceTime);
      
      this.eventTimeouts.set(key, timeout);
    }
  }

  /**
   * Executes an event if it's not on cooldown
   */
  public executeIfNotCooldown(key: string, callback: Function, cooldownTime: number = EVENT_COOLDOWN): boolean {
    const event = this.eventCallbacks.get(key);
    const now = Date.now();
    
    if (!event || (now - event.lastExecuted) > cooldownTime) {
      callback();
      
      // Store last executed timestamp
      this.eventCallbacks.set(key, {
        callback,
        lastExecuted: now
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Clears all pending debounced events
   */
  public clear(): void {
    for (const timeout of this.eventTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.eventTimeouts.clear();
  }
}
