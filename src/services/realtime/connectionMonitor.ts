import { subscriptionRegistry } from './subscriptionRegistry';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { 
  RETRY_MAX, 
  RETRY_DELAY_BASE, 
  CONNECTION_TIMEOUT, 
  HEALTH_CHECK_INTERVAL 
} from './constants';

export class ConnectionMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private retrySubscription: (key: string) => void;
  private updateConnectionStatus: (connected: boolean) => void;
  private isReconnecting: boolean = false;
  
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
    
    // Check connection health regularly
    this.intervalId = setInterval(() => this.check(), HEALTH_CHECK_INTERVAL);
    console.log('[ConnectionMonitor] Started monitoring connection health');
  }
  
  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[ConnectionMonitor] Stopped monitoring connection health');
    }
  }
  
  private check() {
    if (this.isReconnecting) {
      return;
    }

    const statuses = subscriptionRegistry.getAllStatuses();
    const statusKeys = Object.keys(statuses);
    
    if (statusKeys.length === 0) {
      console.log('[ConnectionMonitor] No active subscriptions to monitor');
      return;
    }
    
    // Check if any subscription is disconnected or stale
    const now = Date.now();
    let hasActiveConnection = false;
    let hasStaleConnection = false;
    
    for (const key of statusKeys) {
      const status = statuses[key];
      
      if (status.connected) {
        hasActiveConnection = true;
      }
      
      // Check for stale connections (no updates for too long)
      if (status.lastUpdate) {
        const timeSinceLastUpdate = now - status.lastUpdate.getTime();
        if (timeSinceLastUpdate > CONNECTION_TIMEOUT) {
          console.warn(`[ConnectionMonitor] Stale connection detected for ${key}: ${timeSinceLastUpdate}ms since last update`);
          hasStaleConnection = true;
          
          // Try to reconnect this specific subscription
          this.retry(key, status);
        }
      }
    }
    
    // If no active connections or we found stale ones, update global status
    if (!hasActiveConnection || hasStaleConnection) {
      this.updateConnectionStatus(false);
      
      // If we don't have any working connections, try to reconnect all
      if (!hasActiveConnection) {
        console.log('[ConnectionMonitor] No active connections, attempting global reconnect');
        try {
          this.isReconnecting = true;
          subscriptionRegistry.reconnectAll();
          
          // Give some time for reconnection to complete
          setTimeout(() => {
            this.isReconnecting = false;
          }, RETRY_DELAY_BASE);
        } catch (error) {
          console.error('[ConnectionMonitor] Error during global reconnect:', error);
          this.isReconnecting = false;
        }
      }
    } else {
      // We have active, non-stale connections
      this.updateConnectionStatus(true);
    }
  }
  
  public retry(key: string, status: { retryCount: number }) {
    if (!status) return;
    
    status.retryCount++;
    const delay = RETRY_DELAY_BASE * Math.pow(1.5, status.retryCount - 1);
    
    console.log(`[ConnectionMonitor] Retry ${status.retryCount}/${RETRY_MAX} for ${key} in ${delay}ms`);
    
    setTimeout(() => {
      if (status.retryCount < RETRY_MAX) {
        this.retrySubscription(key);
      } else {
        console.error(`[ConnectionMonitor] Max retries (${RETRY_MAX}) reached for ${key}`);
        // Even after max retries, we'll keep the subscription in the registry
        // so the next health check can try again
      }
    }, delay);
  }
  
  // Method to force reconnection of all subscriptions
  public reconnectAll() {
    if (this.isReconnecting) {
      return;
    }
    
    console.log('[ConnectionMonitor] Forcing reconnection of all subscriptions');
    this.isReconnecting = true;
    
    try {
      this.updateConnectionStatus(false);
      subscriptionRegistry.reconnectAll();
      
      // Give some time for reconnection to complete
      setTimeout(() => {
        this.isReconnecting = false;
        
        // Check if reconnection was successful
        const statuses = subscriptionRegistry.getAllStatuses();
        let hasActiveConnection = Object.values(statuses).some(status => status.connected);
        this.updateConnectionStatus(hasActiveConnection);
      }, RETRY_DELAY_BASE * 2);
    } catch (error) {
      console.error('[ConnectionMonitor] Error during forced reconnect:', error);
      this.isReconnecting = false;
    }
  }
}
