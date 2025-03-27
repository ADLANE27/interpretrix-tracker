
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionStatus, createSubscriptionStatus } from './types';
import { RECONNECT_STAGGER_INTERVAL, RECONNECT_STAGGER_MAX_DELAY } from './constants';

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
   * Reconnect all registered subscriptions with staggered timing
   */
  public reconnectAll(): void {
    if (this.reconnectInProgress) {
      console.log('[RealtimeService] Reconnection already in progress, skipping');
      return;
    }
    
    this.reconnectInProgress = true;
    const keys = Object.keys(this.subscriptionStatuses);
    
    if (keys.length === 0) {
      console.log('[RealtimeService] No subscriptions to reconnect');
      this.reconnectInProgress = false;
      return;
    }
    
    console.log(`[RealtimeService] Attempting to reconnect ${keys.length} subscriptions with staggered timing`);
    
    // First, mark all subscriptions as disconnected
    keys.forEach(key => {
      const status = this.subscriptionStatuses[key];
      if (status) {
        status.connected = false;
      }
    });
    
    // Then reconnect with staggered timing to avoid overwhelming the server
    let reconnectedCount = 0;
    
    keys.forEach((key, index) => {
      const status = this.subscriptionStatuses[key];
      const delay = Math.min(
        index * RECONNECT_STAGGER_INTERVAL, 
        RECONNECT_STAGGER_MAX_DELAY
      );
      
      setTimeout(() => {
        if (status && status.channelRef) {
          try {
            console.log(`[RealtimeService] Reconnecting ${key}`);
            
            // Check if channel is in a state that needs reconnection
            if (status.channelRef.state !== 'joined') {
              // Remove the old channel and create a new subscription if it's in a bad state
              try {
                // Just attempt to reconnect first
                status.channelRef.subscribe((status) => {
                  console.log(`[RealtimeService] Resubscription status for ${key}: ${status}`);
                  // Use the existing channel reference instead of trying to access channelRef property on status
                  if (status === 'SUBSCRIBED') {
                    this.updateStatus(key, true);
                  }
                });
              } catch (error) {
                console.error(`[RealtimeService] Error during resubscription for ${key}:`, error);
              }
            } else {
              console.log(`[RealtimeService] Channel ${key} is already joined, skipping reconnection`);
              this.updateStatus(key, true);
            }
          } catch (error) {
            console.error(`[RealtimeService] Error reconnecting ${key}:`, error);
          }
        }
        
        reconnectedCount++;
        
        // When all reconnections have been attempted, reset the flag
        if (reconnectedCount >= keys.length) {
          setTimeout(() => {
            this.reconnectInProgress = false;
            console.log('[RealtimeService] Reconnection process completed');
          }, 1000); // Give a second for connections to establish
        }
      }, delay);
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
  
  /**
   * Is reconnection in progress
   */
  public isReconnecting(): boolean {
    return this.reconnectInProgress;
  }
}

export const subscriptionRegistry = new SubscriptionRegistry();
