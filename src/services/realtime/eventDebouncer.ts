
import { EVENT_COOLDOWN } from './constants';

export class EventDebouncer {
  private recentEvents = new Map<string, number>();
  
  public shouldProcessEvent(eventKey: string, now: number): boolean {
    const lastProcessed = this.recentEvents.get(eventKey);
    
    if (lastProcessed && now - lastProcessed < EVENT_COOLDOWN) {
      console.log(`[RealtimeService] Skipping duplicate event: ${eventKey}`);
      return false;
    }
    
    this.recentEvents.set(eventKey, now);
    
    // Clean up old entries
    if (this.recentEvents.size > 100) {
      const keysToDelete = [...this.recentEvents.entries()]
        .filter(([_, timestamp]) => now - timestamp > 10000)
        .map(([key]) => key);
        
      keysToDelete.forEach(key => this.recentEvents.delete(key));
    }
    
    return true;
  }
}
