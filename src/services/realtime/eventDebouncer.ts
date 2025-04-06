
/**
 * Utility class to debounce events and manage cooldowns
 */
export class EventDebouncer {
  private eventTimestamps: Map<string, number> = new Map();
  private cooldownPeriod: number;

  constructor(cooldownPeriod = 500) {
    this.cooldownPeriod = cooldownPeriod;
  }

  /**
   * Check if an event should be processed based on cooldown
   */
  public shouldProcessEvent(eventId: string, timestamp: number): boolean {
    const lastTimestamp = this.eventTimestamps.get(eventId);
    
    if (!lastTimestamp || (timestamp - lastTimestamp > this.cooldownPeriod)) {
      this.eventTimestamps.set(eventId, timestamp);
      return true;
    }
    
    return false;
  }

  /**
   * Execute a function after debounce period
   */
  public debounce(
    fn: Function, 
    id: string, 
    wait: number = this.cooldownPeriod
  ): void {
    const timestamp = Date.now();
    const lastExecution = this.eventTimestamps.get(id) || 0;
    
    if (timestamp - lastExecution > wait) {
      fn();
      this.eventTimestamps.set(id, timestamp);
    }
  }

  /**
   * Clear all stored timestamps
   */
  public reset(): void {
    this.eventTimestamps.clear();
  }
}
