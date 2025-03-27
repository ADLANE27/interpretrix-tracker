
import { EVENT_COOLDOWN, STATUS_UPDATE_DEBOUNCE, STATUS_EVENT_PRIORITY } from './constants';

export class EventDebouncer {
  private recentEvents = new Map<string, number>();
  private cleanupTimeout: NodeJS.Timeout | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(private defaultDebounceTime: number = EVENT_COOLDOWN) {
    // Set up periodic cleanup to prevent memory leaks
    this.setupCleanupInterval();
  }
  
  private setupCleanupInterval() {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }
    
    this.cleanupTimeout = setTimeout(() => {
      this.cleanupOldEvents();
      this.setupCleanupInterval();
    }, 30000); // Run cleanup every 30 seconds
  }
  
  private cleanupOldEvents() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Find old entries
    this.recentEvents.forEach((timestamp, key) => {
      if (now - timestamp > 10000) { // 10 seconds
        keysToDelete.push(key);
      }
    });
    
    // Delete old entries
    if (keysToDelete.length > 0) {
      console.log(`[EventDebouncer] Cleaning up ${keysToDelete.length} old events`);
      keysToDelete.forEach(key => this.recentEvents.delete(key));
    }
  }
  
  public shouldProcessEvent(eventKey: string, now: number): boolean {
    // Status updates should ALWAYS be processed immediately
    // Check if this is a status update event (interpreter_profiles table with status field)
    const isStatusUpdate = eventKey.includes('interpreter_profiles') && 
                           eventKey.includes('status');
                          
    if (isStatusUpdate && STATUS_EVENT_PRIORITY) {
      console.log(`[EventDebouncer] Status update detected, processing immediately: ${eventKey}`);
      return true;
    }
    
    const cooldownTime = this.defaultDebounceTime;
    
    if (cooldownTime <= 0) {
      // No debouncing when cooldown is 0 or negative
      return true;
    }
    
    const lastProcessed = this.recentEvents.get(eventKey);
    
    if (lastProcessed && now - lastProcessed < cooldownTime) {
      console.log(`[EventDebouncer] Debouncing event: ${eventKey}`);
      return false;
    }
    
    this.recentEvents.set(eventKey, now);
    
    // Automatic cleanup if Map gets too large
    if (this.recentEvents.size > 1000) {
      this.cleanupOldEvents();
    }
    
    return true;
  }
  
  public debounce(callback: Function, debounceKey: string = 'default', timeout: number = this.defaultDebounceTime): void {
    // Skip debouncing for status updates
    const isStatusUpdate = debounceKey.includes('status');
    
    if (isStatusUpdate || timeout <= 0) {
      // Execute immediately without debouncing
      console.log(`[EventDebouncer] Executing immediately (no debounce): ${debounceKey}`);
      callback();
      return;
    }
    
    // Clear existing timer for this key if it exists
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey)!);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(debounceKey);
    }, timeout);
    
    this.debounceTimers.set(debounceKey, timer);
  }
  
  public dispose() {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
    
    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    // Clear all event tracking
    this.recentEvents.clear();
  }
}
