
/**
 * Helper class to prevent duplicate processing of realtime events
 */
export class EventDebouncer {
  private processedEvents: Map<string, number> = new Map();
  private readonly MAX_EVENTS = 100;
  private readonly EVENT_TTL = 5000; // 5 seconds

  constructor() {
    // Clean up old events periodically
    setInterval(() => this.cleanupOldEvents(), 30000);
  }

  /**
   * Checks if an event should be processed based on its ID and timestamp
   */
  public shouldProcessEvent(eventId: string, timestamp: number): boolean {
    // Check if this event was recently processed
    if (this.processedEvents.has(eventId)) {
      const lastProcessed = this.processedEvents.get(eventId) || 0;
      
      // If it was processed recently, skip it
      if (timestamp - lastProcessed < this.EVENT_TTL) {
        console.log(`[EventDebouncer] Skipping duplicate event: ${eventId}`);
        return false;
      }
    }
    
    // Record that we processed this event
    this.processedEvents.set(eventId, timestamp);
    
    // If we're tracking too many events, remove the oldest ones
    if (this.processedEvents.size > this.MAX_EVENTS) {
      this.cleanupOldEvents();
    }
    
    return true;
  }

  /**
   * Clean up events that are older than the TTL
   */
  private cleanupOldEvents(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    // Find old events
    this.processedEvents.forEach((timestamp, eventId) => {
      if (now - timestamp > this.EVENT_TTL) {
        toDelete.push(eventId);
      }
    });
    
    // Delete them
    toDelete.forEach(eventId => {
      this.processedEvents.delete(eventId);
    });
    
    if (toDelete.length > 0) {
      console.log(`[EventDebouncer] Cleaned up ${toDelete.length} old events`);
    }
  }
}
