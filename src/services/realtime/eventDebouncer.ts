
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
    }, 15000); // Run cleanup every 15 seconds (reduced from 30s)
  }
  
  private cleanupOldEvents() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Find old entries
    this.recentEvents.forEach((timestamp, key) => {
      if (now - timestamp > 5000) { // 5 seconds (reduced from 10s)
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
    // Special handling for status updates to make them nearly instant
    const isStatusUpdate = eventKey.includes('interpreter_profiles-UPDATE') && 
                          eventKey.includes('status');
                          
    // Zero cooldown for status updates for immediate processing
    const cooldownTime = isStatusUpdate ? STATUS_UPDATE_DEBOUNCE : this.defaultDebounceTime;
    
    const lastProcessed = this.recentEvents.get(eventKey);
    
    if (lastProcessed && now - lastProcessed < cooldownTime) {
      return false;
    }
    
    this.recentEvents.set(eventKey, now);
    
    // Automatic cleanup if Map gets too large
    if (this.recentEvents.size > 500) { // Reduced from 1000
      this.cleanupOldEvents();
    }
    
    return true;
  }
  
  public debounce(callback: Function, debounceKey: string = 'default', timeout: number = this.defaultDebounceTime): void {
    // Zero timeout for status updates for immediate updates
    const isStatusUpdate = debounceKey.includes('status');
    const useTimeout = isStatusUpdate ? STATUS_UPDATE_DEBOUNCE : timeout;
    
    // Clear existing timer for this key if it exists
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey)!);
    }
    
    // For status updates, execute immediately
    if (isStatusUpdate && useTimeout === 0) {
      callback();
      return;
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
