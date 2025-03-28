
import { EVENT_COOLDOWN, STATUS_UPDATE_DEBOUNCE, DEBUG_MODE } from './constants';

export class EventDebouncer {
  private recentEvents = new Map<string, number>();
  private cleanupTimeout: NodeJS.Timeout | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventCounts: Map<string, number> = new Map(); // Track event occurrences
  
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
    }, 60000); // Run cleanup every 60 seconds
  }
  
  private cleanupOldEvents() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Find old entries
    this.recentEvents.forEach((timestamp, key) => {
      if (now - timestamp > 60000) { // Increased to 60 seconds for better cleanup
        keysToDelete.push(key);
      }
    });
    
    // Delete old entries
    if (keysToDelete.length > 0 && DEBUG_MODE) {
      console.log(`[EventDebouncer] Cleaning up ${keysToDelete.length} old events`);
      keysToDelete.forEach(key => {
        this.recentEvents.delete(key);
        this.eventCounts.delete(key);
      });
    }
  }
  
  public shouldProcessEvent(eventKey: string, now: number): boolean {
    // Increment event count
    const currentCount = this.eventCounts.get(eventKey) || 0;
    this.eventCounts.set(eventKey, currentCount + 1);
    
    // Prioritize status updates to make them nearly instant
    const isStatusUpdate = eventKey.includes('status') || eventKey.includes('STATUS');
                          
    // Much shorter cooldown for status updates
    const cooldownTime = isStatusUpdate ? STATUS_UPDATE_DEBOUNCE : this.defaultDebounceTime;
    
    const lastProcessed = this.recentEvents.get(eventKey);
    
    if (lastProcessed && now - lastProcessed < cooldownTime) {
      // Don't log on every event to reduce console spam
      if (DEBUG_MODE && !isStatusUpdate && currentCount % 10 === 0) {
        console.log(`[EventDebouncer] Debouncing ${isStatusUpdate ? 'status' : 'duplicate'} event: ${eventKey} (count: ${currentCount})`);
      }
      return false;
    }
    
    this.recentEvents.set(eventKey, now);
    
    // Automatic cleanup if Map gets too large
    if (this.recentEvents.size > 100) { // Reduced from 500 to trigger cleanup more often
      this.cleanupOldEvents();
    }
    
    return true;
  }
  
  public debounce(callback: Function, debounceKey: string = 'default', timeout: number = this.defaultDebounceTime): void {
    // Use nearly zero timeout for status updates
    const isStatusUpdate = debounceKey.includes('status') || debounceKey.includes('STATUS');
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
    this.eventCounts.clear();
  }
}
