
import { RealtimeChannel, RealtimePresenceJoinPayload, RealtimePresenceLeavePayload } from '@supabase/supabase-js';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { supabase } from '@/integrations/supabase/client';
import { 
  RETRY_MAX, 
  RETRY_DELAY_BASE, 
  HEALTH_CHECK_INTERVAL,
  HEARTBEAT_INTERVAL,
  RECONNECT_PERIODIC_INTERVAL
} from './constants';
import { subscriptionRegistry } from './registry/subscriptionRegistry';
import { SubscriptionStatus } from './registry/types';

/**
 * Monitors connection status and handles reconnection for all channels
 */
export class ConnectionMonitor {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private periodicReconnectInterval: NodeJS.Timeout | null = null;
  private retryCallback: (key: string) => void;
  private statusCallback: (connected: boolean) => void;
  private isMonitoring: boolean = false;

  constructor(
    retryCallback: (key: string) => void,
    statusCallback: (connected: boolean) => void
  ) {
    this.retryCallback = retryCallback;
    this.statusCallback = statusCallback;
  }

  /**
   * Start monitoring connection status
   */
  public start(): void {
    if (this.isMonitoring) return;
    
    console.log('[ConnectionMonitor] Starting connection monitoring');
    this.isMonitoring = true;
    
    // Set up periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, HEALTH_CHECK_INTERVAL);
    
    // Set up periodic reconnection to refresh subscriptions
    this.periodicReconnectInterval = setInterval(() => {
      console.log('[ConnectionMonitor] Performing periodic reconnection check');
      this.reconnectStale();
    }, RECONNECT_PERIODIC_INTERVAL);
    
    // Initial health check
    this.checkConnectionHealth();
  }
  
  /**
   * Stop monitoring connection status
   */
  public stop(): void {
    if (!this.isMonitoring) return;
    
    console.log('[ConnectionMonitor] Stopping connection monitoring');
    this.isMonitoring = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.periodicReconnectInterval) {
      clearInterval(this.periodicReconnectInterval);
      this.periodicReconnectInterval = null;
    }
  }
  
  /**
   * Check the health of all connections
   */
  private checkConnectionHealth(): void {
    if (!navigator.onLine) {
      console.log('[ConnectionMonitor] Offline, skipping health check');
      this.statusCallback(false);
      return;
    }
    
    const statuses = subscriptionRegistry.getAllStatuses();
    const keys = Object.keys(statuses);
    
    if (keys.length === 0) {
      // No subscriptions to check
      return;
    }
    
    // Check if any channels are active
    const activeCount = subscriptionRegistry.getActiveCount();
    const hasActiveChannels = activeCount > 0;
    
    console.log(`[ConnectionMonitor] Health check: ${activeCount}/${keys.length} active channels`);
    
    if (!hasActiveChannels && keys.length > 0) {
      console.log('[ConnectionMonitor] No active channels, attempting reconnection');
      this.statusCallback(false);
      this.reconnectAll();
    } else if (hasActiveChannels) {
      // We have active connections
      this.statusCallback(true);
    }
  }
  
  /**
   * Reconnect stale subscriptions (those that haven't been updated in a while)
   */
  private reconnectStale(): void {
    console.log('[ConnectionMonitor] Checking for stale connections to refresh');
    const statuses = subscriptionRegistry.getAllStatuses();
    let reconnectCount = 0;
    
    for (const [key, status] of Object.entries(statuses)) {
      // Check if this is an interpreter status subscription
      if (key.startsWith('interpreter-status-') && status.isActive) {  // Use isActive property consistently
        this.reconnectSubscription(key);
        reconnectCount++;
      }
    }
    
    if (reconnectCount > 0) {
      console.log(`[ConnectionMonitor] Refreshing ${reconnectCount} interpreter status subscriptions`);
    }
  }
  
  /**
   * Reconnect a specific subscription
   */
  public reconnectSubscription(key: string): void {
    console.log(`[ConnectionMonitor] Reconnecting subscription: ${key}`);
    const status = subscriptionRegistry.getStatus(key);
    
    if (!status) {
      console.warn(`[ConnectionMonitor] Cannot reconnect unknown subscription: ${key}`);
      return;
    }
    
    // Use exponential backoff for retries
    const retryCount = Math.min(status.retryCount, RETRY_MAX);
    const delay = Math.min(RETRY_DELAY_BASE * Math.pow(1.5, retryCount), 30000);
    
    console.log(`[ConnectionMonitor] Retry ${retryCount} for ${key} with delay ${delay}ms`);
    
    // Increment retry count
    subscriptionRegistry.updateStatus(key, false);
    
    // Schedule retry
    setTimeout(() => {
      if (this.isMonitoring) {
        this.retryCallback(key);
      }
    }, delay);
  }
  
  /**
   * Reconnect all subscriptions
   */
  public reconnectAll(): void {
    console.log('[ConnectionMonitor] Reconnecting all subscriptions');
    subscriptionRegistry.reconnectAll();
  }
  
  /**
   * Check if realtime connections are healthy
   */
  public isConnected(): boolean {
    const statuses = subscriptionRegistry.getAllStatuses();
    const keys = Object.keys(statuses);
    
    if (keys.length === 0) {
      // No subscriptions to check, assume connected
      return true;
    }
    
    return subscriptionRegistry.getActiveCount() > 0;
  }
}
