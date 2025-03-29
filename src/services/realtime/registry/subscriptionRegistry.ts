
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionStatus, createSubscriptionStatus } from './types';
import { handleStaggeredReconnection } from './reconnectionUtils';

/**
 * Registry to manage and track all active subscriptions
 */
export class SubscriptionRegistry {
  private subscriptionStatuses: Record<string, SubscriptionStatus> = {};
  private reconnectInProgress: boolean = false;
  
  /**
   * Register a new subscription in the registry
   */
  public register(key: string, channel: RealtimeChannel): void {
    this.subscriptionStatuses[key] = createSubscriptionStatus(channel);
    console.log(`[RealtimeService] Registered subscription: ${key}`);
  }
  
  /**
   * Update the status of a subscription
   */
  public updateStatus(key: string, connected: boolean, channel?: RealtimeChannel): void {
    const status = this.subscriptionStatuses[key];
    
    if (!status) {
      this.subscriptionStatuses[key] = createSubscriptionStatus(channel);
      this.subscriptionStatuses[key].connected = connected;
      this.subscriptionStatuses[key].isActive = connected; // Set isActive to the same value as connected
      this.subscriptionStatuses[key].lastUpdate = new Date();
      return;
    }
    
    if (connected) {
      // Reset retry count on successful connection
      status.retryCount = 0;
    }
    
    status.connected = connected;
    status.isActive = connected; // Set isActive to the same value as connected
    status.lastUpdate = new Date();
    
    if (channel) {
      status.channelRef = channel;
    }
  }
  
  /**
   * Remove a subscription from the registry and clean up resources
   */
  public unregister(key: string): void {
    const status = this.subscriptionStatuses[key];
    
    if (status && status.channelRef) {
      console.log(`[RealtimeService] Unregistering subscription: ${key}`);
      try {
        supabase.removeChannel(status.channelRef);
      } catch (error) {
        console.error(`[RealtimeService] Error removing channel for ${key}:`, error);
      }
      delete this.subscriptionStatuses[key];
    }
  }
  
  /**
   * Reconnect all registered subscriptions with staggered timing
   */
  public reconnectAll(): void {
    if (this.reconnectInProgress) {
      console.log('[RealtimeService] Reconnection already in progress, skipping');
      return;
    }
    
    this.reconnectInProgress = true;
    
    // Using the utility function for reconnection logic
    handleStaggeredReconnection(
      this.subscriptionStatuses, 
      (key, connected) => this.updateStatus(key, connected)
    );
    
    // Reset the flag after a delay
    setTimeout(() => {
      this.reconnectInProgress = false;
      console.log('[RealtimeService] Reconnection process completed');
    }, 1000);
  }
  
  /**
   * Get the status of a specific subscription
   */
  public getStatus(key: string): SubscriptionStatus | undefined {
    return this.subscriptionStatuses[key];
  }
  
  /**
   * Get all subscription statuses
   */
  public getAllStatuses(): Record<string, SubscriptionStatus> {
    return { ...this.subscriptionStatuses };
  }
  
  /**
   * Clean up all subscriptions
   */
  public cleanupAll(): void {
    Object.entries(this.subscriptionStatuses).forEach(([key, status]) => {
      if (status.channelRef) {
        try {
          supabase.removeChannel(status.channelRef);
        } catch (error) {
          console.error(`[RealtimeService] Error removing channel for ${key}:`, error);
        }
      }
    });
    
    this.subscriptionStatuses = {};
    console.log(`[RealtimeService] All subscriptions cleaned up`);
  }
  
  /**
   * Get the count of active subscriptions
   */
  public getActiveCount(): number {
    return Object.values(this.subscriptionStatuses).filter(status => status.isActive).length;
  }
  
  /**
   * Get the total count of subscriptions
   */
  public getTotalCount(): number {
    return Object.keys(this.subscriptionStatuses).length;
  }
  
  /**
   * Is reconnection in progress
   */
  public isReconnecting(): boolean {
    return this.reconnectInProgress;
  }
}

// Create a singleton instance
export const subscriptionRegistry = new SubscriptionRegistry();
