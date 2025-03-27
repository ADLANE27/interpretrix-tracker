
import { EVENT_COOLDOWN } from './constants';

export class EventDebouncer {
  private recentEvents = new Map<string, number>();
  private cleanupTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
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
    const lastProcessed = this.recentEvents.get(eventKey);
    
    if (lastProcessed && now - lastProcessed < EVENT_COOLDOWN) {
      console.log(`[RealtimeService] Debouncing duplicate event: ${eventKey}`);
      return false;
    }
    
    this.recentEvents.set(eventKey, now);
    
    // Automatic cleanup if Map gets too large
    if (this.recentEvents.size > 1000) {
      this.cleanupOldEvents();
    }
    
    return true;
  }
  
  public dispose() {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
    this.recentEvents.clear();
  }
}
