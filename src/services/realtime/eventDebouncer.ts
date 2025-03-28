
import { EVENT_COOLDOWN, STATUS_UPDATE_DEBOUNCE, DEBUG_MODE } from './constants';

export class EventDebouncer {
  private recentEvents = new Map<string, number>();
  private cleanupTimeout: NodeJS.Timeout | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventCounts: Map<string, number> = new Map(); // Track event occurrences
  private statusUpdateCache = new Map<string, string>(); // Cache for status updates
  
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
    }, 120000); // Run cleanup every 2 minutes (increased from 60s)
  }
  
  private cleanupOldEvents() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Find old entries
    this.recentEvents.forEach((timestamp, key) => {
      if (now - timestamp > 300000) { // Increased to 5 minutes for better cleanup
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
    
    // Also clean up status cache periodically
    if (this.statusUpdateCache.size > 50) {
      this.statusUpdateCache.clear();
    }
  }
  
  public shouldProcessEvent(eventKey: string, now: number): boolean {
    // Special handling for status updates to prevent duplicates
    if (eventKey.includes('status')) {
      const parts = eventKey.split('-');
      if (parts.length >= 3) {
        const interpreterId = parts[1];
        const newStatus = parts[2];
        const cacheKey = `status-${interpreterId}`;
        
        // Skip if status hasn't changed
        if (this.statusUpdateCache.get(cacheKey) === newStatus) {
          return false;
        }
        
        // Update cache
        this.statusUpdateCache.set(cacheKey, newStatus);
      }
    }
    
    // Increment event count
    const currentCount = this.eventCounts.get(eventKey) || 0;
    this.eventCounts.set(eventKey, currentCount + 1);
    
    // Prioritize status updates to make them less frequent but still timely
    const isStatusUpdate = eventKey.includes('status') || eventKey.includes('STATUS');
                          
    // Much longer cooldown for status updates
    const cooldownTime = isStatusUpdate ? STATUS_UPDATE_DEBOUNCE : this.defaultDebounceTime;
    
    const lastProcessed = this.recentEvents.get(eventKey);
    
    if (lastProcessed && now - lastProcessed < cooldownTime) {
      // Only log once per 50 events to drastically reduce logging
      if (DEBUG_MODE && currentCount % 50 === 0) {
        console.log(`[EventDebouncer] Debouncing ${isStatusUpdate ? 'status' : 'duplicate'} event: ${eventKey} (count: ${currentCount})`);
      }
      return false;
    }
    
    this.recentEvents.set(eventKey, now);
    
    // Automatic cleanup if Map gets too large
    if (this.recentEvents.size > 50) { // Further reduced from 100 to trigger cleanup more often
      this.cleanupOldEvents();
    }
    
    return true;
  }
  
  public debounce(callback: Function, debounceKey: string = 'default', timeout: number = this.defaultDebounceTime): void {
    // Use longer timeout for status updates
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
    this.statusUpdateCache.clear();
  }
}
