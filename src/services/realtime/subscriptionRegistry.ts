
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
      try {
        supabase.removeChannel(status.channelRef);
      } catch (error) {
        console.error(`[RealtimeService] Error removing channel for ${key}:`, error);
      }
      delete this.subscriptionStatuses[key];
    }
  }
  
  /**
   * Reconnect all registered subscriptions
   */
  public reconnectAll(): void {
    const keys = Object.keys(this.subscriptionStatuses);
    console.log(`[RealtimeService] Attempting to reconnect ${keys.length} subscriptions`);
    
    keys.forEach((key, index) => {
      const status = this.subscriptionStatuses[key];
      if (status.channelRef) {
        try {
          // Stagger reconnection attempts to avoid overwhelming the server
          setTimeout(() => {
            console.log(`[RealtimeService] Reconnecting ${key}`);
            if (status.channelRef && status.channelRef.state !== 'joined') {
              status.channelRef.subscribe();
            }
          }, index * 300); // Stagger by 300ms per subscription
        } catch (error) {
          console.error(`[RealtimeService] Error reconnecting ${key}:`, error);
        }
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
    return Object.values(this.subscriptionStatuses).filter(status => status.connected).length;
  }
  
  /**
   * Get the total count of subscriptions
   */
  public getTotalCount(): number {
    return Object.keys(this.subscriptionStatuses).length;
  }
}

export const subscriptionRegistry = new SubscriptionRegistry();
