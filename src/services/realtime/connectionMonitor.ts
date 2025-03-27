
import { subscriptionRegistry } from './subscriptionRegistry';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { 
  RETRY_MAX, 
  RETRY_DELAY_BASE, 
  CONNECTION_TIMEOUT, 
  HEALTH_CHECK_INTERVAL,
  CONNECTION_STATUS_DEBOUNCE_TIME,
  DEBUG_MODE
} from './constants';

export class ConnectionMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private retrySubscription: (key: string) => void;
  private updateConnectionStatus: (connected: boolean) => void;
  private isReconnecting: boolean = false;
  private lastConnectionStatusChange: number = 0;
  private globalConnectionState: boolean = false;
  private consecutiveHealthCheckFailures: number = 0;
  private lastSuccessfulHealthCheck: number = Date.now();
  
  constructor(
    retrySubscription: (key: string) => void,
    updateConnectionStatus: (connected: boolean) => void
  ) {
    this.retrySubscription = retrySubscription;
    this.updateConnectionStatus = updateConnectionStatus;
  }
  
  private log(message: string, ...args: any[]) {
    if (DEBUG_MODE) {
      console.log(`[ConnectionMonitor] ${message}`, ...args);
    }
  }
  
  public start() {
    if (this.intervalId) {
      this.stop();
    }
    
    // Check connection health regularly
    this.intervalId = setInterval(() => this.check(), HEALTH_CHECK_INTERVAL);
    this.log('Started monitoring connection health');
    
    // Initial health check
    setTimeout(() => this.check(), 2000);
  }
  
  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.log('Stopped monitoring connection health');
    }
  }
  
  private check() {
    if (this.isReconnecting) {
      return;
    }

    const statuses = subscriptionRegistry.getAllStatuses();
    const statusKeys = Object.keys(statuses);
    
    if (statusKeys.length === 0) {
      this.log('No active subscriptions to monitor');
      return;
    }
    
    // Check if any subscription is disconnected or stale
    const now = Date.now();
    let hasActiveConnection = false;
    let hasStaleConnection = false;
    let staleDuration = 0;
    
    for (const key of statusKeys) {
      const status = statuses[key];
      
      if (status.connected) {
        hasActiveConnection = true;
      }
      
      // Check for stale connections (no updates for too long)
      if (status.lastUpdate) {
        const timeSinceLastUpdate = now - status.lastUpdate.getTime();
        if (timeSinceLastUpdate > CONNECTION_TIMEOUT) {
          staleDuration = Math.max(staleDuration, timeSinceLastUpdate);
          this.log(`Stale connection detected for ${key}: ${timeSinceLastUpdate}ms since last update`);
          hasStaleConnection = true;
          
          // Try to reconnect this specific subscription
          this.retry(key, status);
        }
      }
    }
    
    // Track consecutive failures
    if (hasStaleConnection || !hasActiveConnection) {
      this.consecutiveHealthCheckFailures++;
      this.log(`Health check failure #${this.consecutiveHealthCheckFailures}`);
    } else {
      if (this.consecutiveHealthCheckFailures > 0) {
        this.log(`Resetting health check failures after ${this.consecutiveHealthCheckFailures} consecutive failures`);
      }
      this.consecutiveHealthCheckFailures = 0;
      this.lastSuccessfulHealthCheck = now;
    }
    
    // Debounce connection status changes to prevent UI flashing
    if (now - this.lastConnectionStatusChange > CONNECTION_STATUS_DEBOUNCE_TIME) {
      const newConnectionState = hasActiveConnection && !hasStaleConnection;
      
      if (newConnectionState !== this.globalConnectionState) {
        this.globalConnectionState = newConnectionState;
        this.lastConnectionStatusChange = now;
        this.updateConnectionStatus(newConnectionState);
        
        // If we don't have any working connections, try to reconnect all
        if (!newConnectionState) {
          this.log('No active connections, attempting global reconnect');
          this.attemptGlobalReconnection();
        }
      }
    }
    
    // Force a global reconnect if we have too many consecutive failures
    if (this.consecutiveHealthCheckFailures >= 3) {
      const timeSinceLastSuccessfulCheck = now - this.lastSuccessfulHealthCheck;
      this.log(`Multiple consecutive health check failures: ${this.consecutiveHealthCheckFailures}. Time since last successful check: ${timeSinceLastSuccessfulCheck}ms`);
      
      if (timeSinceLastSuccessfulCheck > CONNECTION_TIMEOUT * 2) {
        this.log('Forcing global reconnection due to multiple consecutive failures');
        this.attemptGlobalReconnection();
      }
    }
  }
  
  private attemptGlobalReconnection() {
    try {
      if (this.isReconnecting) {
        this.log('Global reconnection already in progress, skipping');
        return;
      }
      
      this.isReconnecting = true;
      // Emit status change immediately to update UI
      eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, false);
      
      this.log('Starting global reconnection process');
      subscriptionRegistry.reconnectAll();
      
      // Give some time for reconnection to complete
      const reconnectTimeout = setTimeout(() => {
        this.isReconnecting = false;
        
        // Final check after reconnection attempt
        const statuses = subscriptionRegistry.getAllStatuses();
        const hasActiveConnection = Object.values(statuses).some(status => status.connected);
        
        this.globalConnectionState = hasActiveConnection;
        this.lastConnectionStatusChange = Date.now();
        this.updateConnectionStatus(hasActiveConnection);
        
        if (hasActiveConnection) {
          this.consecutiveHealthCheckFailures = 0;
          this.lastSuccessfulHealthCheck = Date.now();
        }
        
        this.log(`Global reconnection finished, success: ${hasActiveConnection}`);
      }, RETRY_DELAY_BASE * 2);
      
      // Safety timeout to ensure we don't get stuck in reconnecting state
      setTimeout(() => {
        if (this.isReconnecting) {
          this.log('Forcing exit from reconnection state after timeout');
          this.isReconnecting = false;
          clearTimeout(reconnectTimeout);
          
          // Try to update connection status
          const statuses = subscriptionRegistry.getAllStatuses();
          const hasActiveConnection = Object.values(statuses).some(status => status.connected);
          
          this.globalConnectionState = hasActiveConnection;
          this.updateConnectionStatus(hasActiveConnection);
        }
      }, RETRY_DELAY_BASE * 4);
    } catch (error) {
      console.error('[ConnectionMonitor] Error during global reconnect:', error);
      this.isReconnecting = false;
    }
  }
  
  public retry(key: string, status: { retryCount: number }) {
    if (!status) return;
    
    status.retryCount++;
    // Implement exponential backoff for retries with jitter
    const random = Math.random() * 0.3 + 0.85; // 0.85-1.15 range for jitter
    const delay = Math.min(
      RETRY_DELAY_BASE * Math.pow(1.5, status.retryCount - 1) * random,
      RETRY_DELAY_BASE * 10 // Cap maximum delay
    );
    
    this.log(`Retry ${status.retryCount}/${RETRY_MAX} for ${key} in ${delay}ms`);
    
    setTimeout(() => {
      if (status.retryCount < RETRY_MAX) {
        this.retrySubscription(key);
      } else {
        console.error(`[ConnectionMonitor] Max retries (${RETRY_MAX}) reached for ${key}`);
        // Reset retry count to allow future health checks to retry again
        status.retryCount = 0;
      }
    }, delay);
  }
  
  // Method to force reconnection of all subscriptions
  public reconnectAll() {
    if (this.isReconnecting) {
      return;
    }
    
    this.log('Forcing reconnection of all subscriptions');
    this.attemptGlobalReconnection();
  }
  
  // Utility method to get diagnostic information
  public getDiagnostics() {
    return {
      isReconnecting: this.isReconnecting,
      globalConnectionState: this.globalConnectionState,
      consecutiveHealthCheckFailures: this.consecutiveHealthCheckFailures,
      lastSuccessfulHealthCheck: new Date(this.lastSuccessfulHealthCheck).toISOString(),
      subscriptionCount: Object.keys(subscriptionRegistry.getAllStatuses()).length,
      activeSubscriptionCount: Object.values(subscriptionRegistry.getAllStatuses()).filter(s => s.connected).length
    };
  }
}
