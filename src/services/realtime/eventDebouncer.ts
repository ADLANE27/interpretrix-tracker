
import { EVENT_COOLDOWN, STATUS_UPDATE_DEBOUNCE } from './constants';

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
    // Check if this is a status update event
    const isStatusUpdate = eventKey.includes('interpreter_profiles-UPDATE') && 
                          eventKey.includes('status');
                          
    // Use an extremely short cooldown for status updates
    const cooldownTime = isStatusUpdate ? STATUS_UPDATE_DEBOUNCE : this.defaultDebounceTime;
    
    const lastProcessed = this.recentEvents.get(eventKey);
    
    if (lastProcessed && now - lastProcessed < cooldownTime) {
      // Don't log for status updates to reduce console noise
      if (!isStatusUpdate) {
        console.log(`[RealtimeService] Debouncing event: ${eventKey}`);
      }
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
    // Use extremely short timeout for status updates
    const isStatusUpdate = debounceKey.includes('status');
    const useTimeout = isStatusUpdate ? STATUS_UPDATE_DEBOUNCE : timeout;
    
    // Clear existing timer for this key if it exists
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey)!);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(debounceKey);
    }, useTimeout);
    
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
