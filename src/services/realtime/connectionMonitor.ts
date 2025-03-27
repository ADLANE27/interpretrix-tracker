
import { RETRY_MAX, RETRY_DELAY_BASE, CONNECTION_TIMEOUT } from './constants';

export class ConnectionMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private retrySubscription: (key: string) => void;
  private updateConnectionStatus: (connected: boolean) => void;
  
  constructor(
    retrySubscription: (key: string) => void,
    updateConnectionStatus: (connected: boolean) => void
  ) {
    this.retrySubscription = retrySubscription;
    this.updateConnectionStatus = updateConnectionStatus;
  }
  
  public start() {
    if (this.intervalId) {
      this.stop();
    }
    
    this.intervalId = setInterval(() => this.check(), 10000); // Check every 10 seconds
  }
  
  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private check() {
    // This method would check all subscription statuses
    // and trigger reconnection attempts for any that are stale
    // Implementation depends on how we want to access subscription statuses
    // For now, it's a placeholder
  }
  
  public retry(key: string, status: { retryCount: number }) {
    if (!status) return;
    
    status.retryCount++;
    const delay = RETRY_DELAY_BASE * Math.pow(1.5, status.retryCount - 1);
    
    console.log(`[RealtimeService] Retry ${status.retryCount}/${RETRY_MAX} for ${key} in ${delay}ms`);
    
    setTimeout(() => {
      if (status.retryCount < RETRY_MAX) {
        this.retrySubscription(key);
      }
    }, delay);
  }
}
