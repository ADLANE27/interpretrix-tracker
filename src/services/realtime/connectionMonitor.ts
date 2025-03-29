
import { subscriptionRegistry } from './registry/subscriptionRegistry';
import { CONNECTION_CONSTANTS } from '../../hooks/supabase-connection/constants';

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
  private channelStatuses: Map<string, boolean> = new Map();

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
    this.lastSuccessfulConnection = Date.now();
    this.consecutiveFailures = 0;

    // Initial connection check
    this.checkConnectionStatus();

    // Set up periodic check
    this.checkInterval = setInterval(() => {
      this.checkConnectionStatus();
    }, CONNECTION_CONSTANTS.HEARTBEAT_INTERVAL);
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
   * Check if monitor is connected
   */
  public isConnected(): boolean {
    const statuses = subscriptionRegistry.getAllStatuses();
    const activeSubscriptions = Object.keys(statuses).filter(key => statuses[key].isActive);
    
    if (activeSubscriptions.length === 0) {
      // No active subscriptions, consider it connected
      return true;
    }

    // Check if any subscriptions are disconnected
    const disconnectedSubscriptions = activeSubscriptions.filter(key => !statuses[key].connected);
    return disconnectedSubscriptions.length === 0;
  }

  /**
   * Check if connection is healthy based on channel statuses
   */
  public isConnectionHealthy(): boolean {
    // If we have no channels, assume connection is healthy
    if (this.channelStatuses.size === 0) {
      return true;
    }

    // Check if all channels are healthy
    for (const [_, isHealthy] of this.channelStatuses.entries()) {
      if (!isHealthy) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Update the status of a specific channel
   */
  public updateChannelStatus(channelKey: string, isConnected: boolean): void {
    this.channelStatuses.set(channelKey, isConnected);
    
    // Update overall connection status if needed
    const wasConnected = this.isConnectionHealthy();
    
    if (wasConnected !== this.lastConnectionStatus) {
      this.lastConnectionStatus = wasConnected;
      this.connectionCallback(wasConnected);
    }
  }

  /**
   * Attempt to reconnect all subscriptions
   */
  public reconnectAll(): void {
    console.log('[ConnectionMonitor] Attempting to reconnect all subscriptions');
    
    const statuses = subscriptionRegistry.getAllStatuses();
    const activeSubscriptions = Object.keys(statuses).filter(key => statuses[key].isActive);
    
    if (activeSubscriptions.length === 0) {
      // No active subscriptions to reconnect
      return;
    }

    // Attempt to reconnect all subscriptions
    activeSubscriptions.forEach(key => {
      // Reset max retries flag
      if (statuses[key].maxRetriesReached) {
        statuses[key].maxRetriesReached = false;
        statuses[key].retryCount = 0;
      }

      // Stagger reconnections to avoid thundering herd
      const delay = Math.random() * 3000;
      setTimeout(() => {
        if (this.isActive) {
          console.log(`[ConnectionMonitor] Reconnecting subscription: ${key}`);
          this.retryCallback(key);
        }
      }, delay);
    });
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
    const maxRetriesReachedSubscriptions = activeSubscriptions.filter(
      key => statuses[key].maxRetriesReached === true
    );
    
    // If any subscription has reached max retries, we should try to recover it
    if (maxRetriesReachedSubscriptions.length > 0) {
      console.log(`[ConnectionMonitor] ${maxRetriesReachedSubscriptions.length} subscriptions have reached max retries`);
      
      // Reset max retries flag and try again for these subscriptions
      maxRetriesReachedSubscriptions.forEach(key => {
        if (statuses[key].maxRetriesReached) {
          statuses[key].maxRetriesReached = false;
          statuses[key].retryCount = 0;
          
          // Add some delay to avoid thundering herd
          const delay = Math.random() * 2000;
          setTimeout(() => {
            if (this.isActive) {
              console.log(`[ConnectionMonitor] Attempting recovery for subscription: ${key}`);
              this.retryCallback(key);
            }
          }, delay);
        }
      });
    }
    
    const isAnyDisconnected = disconnectedSubscriptions.length > 0;
    
    // If status changed, notify via callback
    if (this.lastConnectionStatus !== !isAnyDisconnected) {
      this.lastConnectionStatus = !isAnyDisconnected;
      
      if (!isAnyDisconnected) {
        // Reset failure count on successful connection
        this.consecutiveFailures = 0;
        this.lastSuccessfulConnection = Date.now();
        console.log('[ConnectionMonitor] Connection status changed: connected');
      } else {
        this.consecutiveFailures++;
        console.log(`[ConnectionMonitor] Connection status changed: disconnected (failures: ${this.consecutiveFailures})`);
      }
      
      this.connectionCallback(!isAnyDisconnected);
    }

    // Handle disconnected subscriptions with exponential backoff
    const currentTime = Date.now();
    const timeSinceLastSuccess = currentTime - this.lastSuccessfulConnection;
    
    // If we've been trying to reconnect for too long, attempt a full recovery
    if (isAnyDisconnected && timeSinceLastSuccess > CONNECTION_CONSTANTS.HEARTBEAT_TIMEOUT * 2) {
      console.log('[ConnectionMonitor] Extended disconnect detected, attempting full recovery');
      
      disconnectedSubscriptions.forEach((key) => {
        // Clear any existing retry timer
        if (this.retryTimers.has(key)) {
          clearTimeout(this.retryTimers.get(key));
        }
        
        // Setup staggered reconnection
        const delay = Math.random() * 3000; // Random delay up to 3 seconds to avoid thundering herd
        const timer = setTimeout(() => {
          if (this.isActive) {
            console.log(`[ConnectionMonitor] Attempting recovery for subscription: ${key}`);
            this.retryCallback(key);
            this.retryTimers.delete(key);
          }
        }, delay);
        
        this.retryTimers.set(key, timer);
      });
      
      // Reset the last successful connection time to avoid repeated recovery attempts
      this.lastSuccessfulConnection = currentTime;
    }
  }
}
