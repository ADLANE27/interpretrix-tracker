
import { subscriptionRegistry } from './registry/subscriptionRegistry';
import { HEALTH_CHECK_INTERVAL, RETRY_MAX, RETRY_DELAY_BASE, DEBUG_MODE } from './constants';

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
  private lastSuccessfulConnection: number = Date.now();
  private consecutiveFailures: number = 0;

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

    if (DEBUG_MODE) console.log('[ConnectionMonitor] Starting connection monitoring');
    this.isActive = true;
    this.lastSuccessfulConnection = Date.now();
    this.consecutiveFailures = 0;

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

    if (DEBUG_MODE) console.log('[ConnectionMonitor] Stopping connection monitoring');
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
    if (!this.isActive) return;
    
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
      
      if (!isAnyDisconnected) {
        // Reset failure count on successful connection
        this.consecutiveFailures = 0;
        this.lastSuccessfulConnection = Date.now();
        if (DEBUG_MODE) console.log('[ConnectionMonitor] Connection restored');
      } else {
        this.consecutiveFailures++;
        if (DEBUG_MODE) console.log(`[ConnectionMonitor] Connection lost (failures: ${this.consecutiveFailures})`);
      }
      
      this.connectionCallback(!isAnyDisconnected);
    }

    // Handle disconnected subscriptions with exponential backoff
    if (isAnyDisconnected) {
      const timeSinceLastSuccess = Date.now() - this.lastSuccessfulConnection;
      
      disconnectedSubscriptions.forEach(key => {
        const status = statuses[key];
        
        // Only retry if we haven't exceeded max retries and we're not already retrying
        if (status.retryCount < RETRY_MAX && !this.retryTimers.has(key)) {
          // Calculate backoff delay with jitter
          const baseDelay = Math.min(
            RETRY_DELAY_BASE * Math.pow(1.5, Math.min(status.retryCount, 10)),
            30000
          );
          
          // Add jitter to avoid thundering herd problem (±20%)
          const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
          const delay = Math.max(1000, baseDelay + jitter);
          
          if (DEBUG_MODE) {
            console.log(`[ConnectionMonitor] Scheduling retry for ${key} in ${Math.round(delay)}ms (attempt ${status.retryCount + 1}/${RETRY_MAX})`);
          }
          
          // Schedule retry with increasing delay
          const timer = setTimeout(() => {
            if (DEBUG_MODE) console.log(`[ConnectionMonitor] Retrying connection for ${key}`);
            this.retryTimers.delete(key);
            this.retryCallback(key);
          }, delay);
          
          this.retryTimers.set(key, timer);
        } else if (status.retryCount >= RETRY_MAX) {
          // Log when max retries reached
          if (!status.maxRetriesReached) {
            status.maxRetriesReached = true;
            console.warn(`[ConnectionMonitor] Max retries (${RETRY_MAX}) reached for ${key}`);
          }
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
    if (DEBUG_MODE) console.log('[ConnectionMonitor] Force reconnecting all subscriptions');
    
    // Clear existing timers
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
    
    // Reset retry counters
    const statuses = subscriptionRegistry.getAllStatuses();
    Object.keys(statuses).forEach(key => {
      if (statuses[key].isActive) {
        statuses[key].retryCount = 0;
        statuses[key].maxRetriesReached = false;
      }
    });
    
    // Get all subscriptions and retry them with slight staggering
    Object.keys(statuses).forEach((key, index) => {
      if (statuses[key].isActive) {
        // Stagger reconnects by 50ms each to avoid overwhelming the server
        setTimeout(() => {
          if (DEBUG_MODE) console.log(`[ConnectionMonitor] Force reconnecting ${key}`);
          this.retryCallback(key);
        }, index * 50);
      }
    });
    
    // Reset connection status
    this.lastConnectionStatus = false;
    this.connectionCallback(false);
    
    // Force a connection status update after a delay
    setTimeout(() => {
      this.checkConnectionStatus();
    }, 2000);
  }
  
  /**
   * Get time since last successful connection
   */
  public getTimeSinceLastSuccess(): number {
    return Date.now() - this.lastSuccessfulConnection;
  }
  
  /**
   * Get consecutive failure count
   */
  public getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }
}
