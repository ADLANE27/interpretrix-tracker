
type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Record<string, EventCallback[]> = {};

  public on(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // Return a function to remove this specific listener
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  public emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(...args));
  }
}

// Create a singleton instance
export const eventEmitter = new EventEmitter();

// Event names constants
export const EVENT_UNREAD_MENTIONS_UPDATED = 'unread_mentions_updated';
