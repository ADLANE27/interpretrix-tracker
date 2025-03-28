
import { RETRY_MAX, RETRY_DELAY_BASE, CONNECTION_TIMEOUT, RECONNECT_PERIODIC_INTERVAL } from './constants';
import { subscriptionRegistry } from './registry/subscriptionRegistry';

/**
 * Monitors connection status and triggers reconnection when needed
 */
export class ConnectionMonitor {
  private isConnectedFlag: boolean = true;
  private checkTimer: NodeJS.Timeout | null = null;
  private reconnectPeriodicTimer: NodeJS.Timeout | null = null;
  private retryCount: Map<string, number> = new Map();
  private lastConnectionCheck: number = Date.now();
  private onSubscriptionRetryCallback: (key: string) => void;
  private onConnectionStatusChangeCallback: (connected: boolean) => void;
  private reconnectQueued: boolean = false;
  
  constructor(
    onSubscriptionRetry: (key: string) => void,
    onConnectionStatusChange: (connected: boolean) => void
  ) {
    this.onSubscriptionRetryCallback = onSubscriptionRetry;
    this.onConnectionStatusChangeCallback = onConnectionStatusChange;
  }
  
  /**
   * Start monitoring connections
   */
  public start(): void {
    console.log('[ConnectionMonitor] Starting');
    
    // Initial check
    this.checkSubscriptions();
    
    // Periodic full reconnects (every 5 minutes)
    if (this.reconnectPeriodicTimer) {
      clearInterval(this.reconnectPeriodicTimer);
    }
    
    this.reconnectPeriodicTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('[ConnectionMonitor] Performing periodic health check');
        this.checkSubscriptions();
      }
    }, RECONNECT_PERIODIC_INTERVAL);
    
    // Set up event handlers
    this.setupEventHandlers();
  }
  
  /**
   * Set up event handlers for page visibility and other events
   */
  private setupEventHandlers(): void {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Only check if it's been at least 10 seconds since the last check
        if (now - this.lastConnectionCheck > 10000) {
          console.log('[ConnectionMonitor] Page became visible, checking subscriptions');
          this.lastConnectionCheck = now;
          this.checkSubscriptions();
        }
      }
    });
    
    // Handle online/offline events
    window.addEventListener('online', () => {
      console.log('[ConnectionMonitor] Network connection restored');
      this.checkSubscriptions();
    });
    
    window.addEventListener('offline', () => {
      console.log('[ConnectionMonitor] Network connection lost');
      this.handleConnectionStatusChange(false);
    });
  }
  
  /**
   * Stop monitoring
   */
  public stop(): void {
    console.log('[ConnectionMonitor] Stopping');
    
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }
    
    if (this.reconnectPeriodicTimer) {
      clearInterval(this.reconnectPeriodicTimer);
      this.reconnectPeriodicTimer = null;
    }
  }
  
  /**
   * Check all subscriptions and reconnect if needed
   */
  private checkSubscriptions(): void {
    if (this.reconnectQueued) {
      return; // Avoid duplicate checks
    }
    
    this.reconnectQueued = true;
    
    // Use setTimeout to offset this work
    setTimeout(() => {
      try {
        this.lastConnectionCheck = Date.now();
        const statuses = subscriptionRegistry.getAllStatuses();
        let activeCount = 0;
        let totalCount = 0;
        
        // Count active subscriptions
        for (const key in statuses) {
          totalCount++;
          if (statuses[key].isActive) {
            activeCount++;
          }
        }
        
        // If we have any subscriptions
        if (totalCount > 0) {
          // If less than 50% of subscriptions are active, consider disconnected
          const connectionRatio = activeCount / totalCount;
          const newConnectionStatus = connectionRatio >= 0.5;
          
          // Only log significant changes
          if (newConnectionStatus !== this.isConnectedFlag) {
            console.log(`[ConnectionMonitor] Connection status changed: ${newConnectionStatus} (${activeCount}/${totalCount} active)`);
            this.handleConnectionStatusChange(newConnectionStatus);
          }
          
          // Retry inactive subscriptions
          for (const key in statuses) {
            if (!statuses[key].isActive) {
              this.retrySubscription(key);
            }
          }
        } else {
          // No subscriptions, consider connected
          this.handleConnectionStatusChange(true);
        }
      } catch (error) {
        console.error('[ConnectionMonitor] Error checking subscriptions:', error);
      } finally {
        this.reconnectQueued = false;
      }
    }, 50); // Add small delay to prevent immediate execution
  }
  
  /**
   * Retry a subscription with exponential backoff
   */
  private retrySubscription(key: string): void {
    const retryCount = this.retryCount.get(key) || 0;
    
    if (retryCount >= RETRY_MAX) {
      console.log(`[ConnectionMonitor] Max retries reached for ${key}`);
      return;
    }
    
    // Exponential backoff with jitter
    const delay = RETRY_DELAY_BASE * Math.pow(1.5, retryCount) * (0.8 + Math.random() * 0.4);
    
    console.log(`[ConnectionMonitor] Scheduling retry ${retryCount + 1}/${RETRY_MAX} for ${key} in ${Math.round(delay)}ms`);
    
    setTimeout(() => {
      this.onSubscriptionRetryCallback(key);
      this.retryCount.set(key, retryCount + 1);
    }, delay);
  }
  
  /**
   * Handle connection status change
   */
  private handleConnectionStatusChange(connected: boolean): void {
    if (connected !== this.isConnectedFlag) {
      this.isConnectedFlag = connected;
      console.log(`[ConnectionMonitor] Connection status changed: ${connected}`);
      this.onConnectionStatusChangeCallback(connected);
      
      if (connected) {
        // Clear retry counters when connection is restored
        this.retryCount.clear();
      }
    }
  }
  
  /**
   * Reconnect all subscriptions
   */
  public reconnectAll(): void {
    console.log('[ConnectionMonitor] Reconnecting all subscriptions');
    this.retryCount.clear(); // Reset retry counters
    const statuses = subscriptionRegistry.getAllStatuses();
    
    // Mark all as inactive
    for (const key in statuses) {
      subscriptionRegistry.updateStatus(key, false);
    }
    
    // Retry all subscriptions
    for (const key in statuses) {
      this.onSubscriptionRetryCallback(key);
    }
  }
  
  /**
   * Get current connection status
   */
  public isConnected(): boolean {
    return this.isConnectedFlag;
  }
}
