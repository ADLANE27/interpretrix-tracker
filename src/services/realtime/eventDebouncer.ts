
/**
 * Utility class to debounce events and manage cooldowns
 */
export class EventDebouncer {
  private eventTimestamps: Map<string, number> = new Map();
  private cooldownPeriod: number;
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

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
   * Debounce a function, ensuring it's only called once within the specified wait time
   * This is useful for functions that are called rapidly
   */
  public debounceAsync<T extends (...args: any[]) => any>(
    func: T,
    id: string,
    wait: number = this.cooldownPeriod
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      // Clear previous timeout if it exists
      if (this.timeouts.has(id)) {
        clearTimeout(this.timeouts.get(id)!);
      }
      
      // Set new timeout
      const timeout = setTimeout(() => {
        func(...args);
        this.timeouts.delete(id);
      }, wait);
      
      this.timeouts.set(id, timeout);
    };
  }

  /**
   * Clear all stored timestamps
   */
  public reset(): void {
    this.eventTimestamps.clear();
    
    // Clear all timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }

  /**
   * Clear a specific debounce timeout
   */
  public clearDebounce(id: string): void {
    if (this.timeouts.has(id)) {
      clearTimeout(this.timeouts.get(id)!);
      this.timeouts.delete(id);
    }
  }
}
