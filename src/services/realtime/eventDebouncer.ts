
import { EVENT_COOLDOWN, STATUS_UPDATE_DEBOUNCE, DEBUG_MODE } from './constants';

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
    }, 60000); // Run cleanup every 60 seconds
  }
  
  private cleanupOldEvents() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Find old entries
    this.recentEvents.forEach((timestamp, key) => {
      if (now - timestamp > 30000) { // 30 seconds timeout for cleanup
        keysToDelete.push(key);
      }
    });
    
    // Delete old entries
    if (keysToDelete.length > 0 && DEBUG_MODE) {
      console.log(`[EventDebouncer] Cleaning up ${keysToDelete.length} old events`);
      keysToDelete.forEach(key => this.recentEvents.delete(key));
    }
  }
  
  public shouldProcessEvent(eventKey: string, now: number): boolean {
    // Mentions related events should not be debounced as aggressively
    const isMentionEvent = eventKey.includes('mention') || eventKey.includes('MENTION');
    const isStatusUpdate = eventKey.includes('status') || eventKey.includes('STATUS');
                          
    // Different cooldown times based on event type
    let cooldownTime = this.defaultDebounceTime;
    if (isStatusUpdate) {
      cooldownTime = STATUS_UPDATE_DEBOUNCE;
    } else if (isMentionEvent) {
      cooldownTime = 10; // Nearly instant processing for mention events
    }
    
    const lastProcessed = this.recentEvents.get(eventKey);
    
    if (lastProcessed && now - lastProcessed < cooldownTime) {
      if (DEBUG_MODE && !isStatusUpdate && !isMentionEvent) {
        console.log(`[EventDebouncer] Debouncing ${isStatusUpdate ? 'status' : isMentionEvent ? 'mention' : 'duplicate'} event: ${eventKey}`);
      }
      return false;
    }
    
    this.recentEvents.set(eventKey, now);
    
    // Automatic cleanup if Map gets too large
    if (this.recentEvents.size > 300) { // Reduced threshold
      this.cleanupOldEvents();
    }
    
    return true;
  }
  
  public debounce(callback: Function, debounceKey: string = 'default', timeout: number = this.defaultDebounceTime): void {
    // Use appropriate timeout based on event type
    const isMentionEvent = debounceKey.includes('mention') || debounceKey.includes('MENTION');
    const isStatusUpdate = debounceKey.includes('status') || debounceKey.includes('STATUS');
    
    let useTimeout = timeout;
    if (isStatusUpdate) {
      useTimeout = STATUS_UPDATE_DEBOUNCE;
    } else if (isMentionEvent) {
      useTimeout = 10; // Nearly instant processing for mention events
    }
    
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
