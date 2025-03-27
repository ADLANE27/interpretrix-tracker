
import { subscriptionRegistry } from './registry/subscriptionRegistry';
import { HEALTH_CHECK_INTERVAL, RETRY_MAX, RETRY_DELAY_BASE } from './constants';

type RetryCallback = (key: string) => void;
type ConnectionCallback = (connected: boolean) => void;

/**
 * Monitors connection status and handles reconnection
 */
export class ConnectionMonitor {
  private retryCallback: RetryCallback;
  private connectionCallback: ConnectionCallback;
  private checkInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private lastConnectionStatus: boolean = true;
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(retryCallback: RetryCallback, connectionCallback: ConnectionCallback) {
    this.retryCallback = retryCallback;
    this.connectionCallback = connectionCallback;
  }

  /**
   * Start monitoring connection status
   */
  public start(): void {
    if (this.isActive) {
      return;
    }

    console.log('[ConnectionMonitor] Starting connection monitoring');
    this.isActive = true;

    // Initial connection check
    this.checkConnectionStatus();

    // Set up periodic check
    this.checkInterval = setInterval(() => {
      this.checkConnectionStatus();
    }, HEALTH_CHECK_INTERVAL);
  }

  /**
   * Stop monitoring connection status
   */
  public stop(): void {
    if (!this.isActive) {
      return;
    }

    console.log('[ConnectionMonitor] Stopping connection monitoring');
    this.isActive = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Clear all retry timers
    this.retryTimers.forEach((timer) => clearTimeout(timer));
    this.retryTimers.clear();
  }

  /**
   * Check connection status of all subscriptions
   */
  private checkConnectionStatus(): void {
    const statuses = subscriptionRegistry.getAllStatuses();
    const activeSubscriptions = Object.keys(statuses).filter(key => statuses[key].isActive);
    
    if (activeSubscriptions.length === 0) {
      // No active subscriptions to check
      return;
    }

    // Check if any subscriptions are disconnected
    const disconnectedSubscriptions = activeSubscriptions.filter(key => !statuses[key].connected);
    const isAnyDisconnected = disconnectedSubscriptions.length > 0;
    
    // If status changed, notify via callback
    if (this.lastConnectionStatus !== !isAnyDisconnected) {
      this.lastConnectionStatus = !isAnyDisconnected;
      this.connectionCallback(!isAnyDisconnected);
    }

    // Handle reconnections for disconnected subscriptions
    if (isAnyDisconnected) {
      disconnectedSubscriptions.forEach(key => {
        const status = statuses[key];
        
        // Only retry if we haven't exceeded max retries
        if (status.retryCount < RETRY_MAX && !this.retryTimers.has(key)) {
          // Calculate backoff delay
          const delay = Math.min(
            RETRY_DELAY_BASE * Math.pow(1.5, status.retryCount),
            30000
          );
          
          console.log(`[ConnectionMonitor] Scheduling retry for ${key} in ${delay}ms (attempt ${status.retryCount + 1}/${RETRY_MAX})`);
          
          // Schedule retry
          const timer = setTimeout(() => {
            console.log(`[ConnectionMonitor] Retrying connection for ${key}`);
            this.retryTimers.delete(key);
            this.retryCallback(key);
          }, delay);
          
          this.retryTimers.set(key, timer);
        }
      });
    }
  }

  /**
   * Check if system is currently connected
   */
  public isConnected(): boolean {
    return this.lastConnectionStatus;
  }
  
  /**
   * Force reconnection for all subscriptions
   */
  public reconnectAll(): void {
    console.log('[ConnectionMonitor] Force reconnecting all subscriptions');
    
    // Clear existing timers
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
    
    // Get all subscriptions and retry them
    const statuses = subscriptionRegistry.getAllStatuses();
    Object.keys(statuses).forEach(key => {
      if (statuses[key].isActive) {
        console.log(`[ConnectionMonitor] Force reconnecting ${key}`);
        this.retryCallback(key);
      }
    });
    
    // Reset connection status
    this.lastConnectionStatus = false;
    this.connectionCallback(false);
    
    // Force a connection status update
    setTimeout(() => {
      this.checkConnectionStatus();
    }, 2000);
  }
}
