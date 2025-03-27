
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionStatus, createSubscriptionStatus } from './types';

/**
 * Registry to manage and track all active subscriptions
 */
export class SubscriptionRegistry {
  private subscriptionStatuses: Record<string, SubscriptionStatus> = {};
  
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
      this.subscriptionStatuses[key].lastUpdate = new Date();
      return;
    }
    
    if (connected) {
      // Reset retry count on successful connection
      status.retryCount = 0;
    }
    
    status.connected = connected;
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
      supabase.removeChannel(status.channelRef);
      delete this.subscriptionStatuses[key];
    }
  }
  
  /**
   * Reconnect all registered subscriptions
   */
  public reconnectAll(): void {
    Object.entries(this.subscriptionStatuses).forEach(([key, status]) => {
      if (status.channelRef) {
        console.log(`[RealtimeService] Reconnecting ${key}`);
        status.channelRef.subscribe();
      }
    });
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
        supabase.removeChannel(status.channelRef);
      }
    });
    
    Object.keys(this.subscriptionStatuses).forEach(key => {
      delete this.subscriptionStatuses[key];
    });
    
    console.log(`[RealtimeService] All subscriptions cleaned up`);
  }
}

export const subscriptionRegistry = new SubscriptionRegistry();
