
/**
 * Utility class to debounce events and manage cooldowns
 */
export class EventDebouncer {
  private eventTimestamps: Map<string, {timestamp: number, value?: any}> = new Map();
  private cooldownPeriod: number;

  constructor(cooldownPeriod = 1500) { // Increased default to 1.5 seconds
    this.cooldownPeriod = cooldownPeriod;
  }

  /**
   * Check if an event should be processed based on cooldown
   * Added support for value-based deduplication
   */
  public shouldProcessEvent(eventId: string, timestamp: number, value?: any): boolean {
    const lastData = this.eventTimestamps.get(eventId);
    
    if (!lastData) {
      this.eventTimestamps.set(eventId, { timestamp, value });
      return true;
    }
    
    // If same value and within cooldown, don't process
    if (value !== undefined && 
        JSON.stringify(lastData.value) === JSON.stringify(value) && 
        timestamp - lastData.timestamp < this.cooldownPeriod) {
      return false;
    }
    
    // If within cooldown period, don't process regardless of value
    if (timestamp - lastData.timestamp < this.cooldownPeriod) {
      return false;
    }
    
    // Update the timestamp and value
    this.eventTimestamps.set(eventId, { timestamp, value });
    return true;
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
    const lastData = this.eventTimestamps.get(id);
    
    if (!lastData || timestamp - lastData.timestamp > wait) {
      fn();
      this.eventTimestamps.set(id, { timestamp });
    }
  }

  /**
   * Clear all stored timestamps
   */
  public reset(): void {
    this.eventTimestamps.clear();
  }
}
