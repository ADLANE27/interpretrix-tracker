
import { supabase } from '@/integrations/supabase/client';
import EventEmitter from 'events';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as constants from './constants';

// Define subscription status types
export type SubscriptionStatus = {
  isActive: boolean;
  connectionError: boolean;
  lastConnected: number | null;
  retryCount: number;
  retryTimeout: NodeJS.Timeout | null;
  channel: RealtimeChannel | null;
};

export class ConnectionMonitor {
  private channels: Map<string, SubscriptionStatus> = new Map();
  private eventEmitter: EventEmitter;
  private globalStatus: {
    isConnected: boolean;
    lastConnected: number | null;
  };

  constructor(emitter: EventEmitter) {
    this.eventEmitter = emitter;
    this.globalStatus = {
      isConnected: true,
      lastConnected: Date.now(),
    };
  }

  public subscribe(channelName: string, options: any): SubscriptionStatus {
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    const channel = supabase.channel(channelName, options);
    
    const status: SubscriptionStatus = {
      isActive: false,
      connectionError: false,
      lastConnected: null,
      retryCount: 0,
      retryTimeout: null,
      channel: channel,
    };

    this.channels.set(channelName, status);
    
    channel.subscribe((state) => {
      if (state === 'SUBSCRIBED') {
        this.handleSubscribed(channelName);
      } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
        this.handleError(channelName);
      }
    });

    return status;
  }

  private handleSubscribed(channelName: string): void {
    const status = this.channels.get(channelName);
    if (!status) return;

    status.isActive = true;
    status.connectionError = false;
    status.lastConnected = Date.now();
    status.retryCount = 0;

    if (status.retryTimeout) {
      clearTimeout(status.retryTimeout);
      status.retryTimeout = null;
    }

    this.channels.set(channelName, status);
    this.updateGlobalStatus();
  }

  private handleError(channelName: string): void {
    const status = this.channels.get(channelName);
    if (!status) return;

    status.isActive = false;
    status.connectionError = true;

    // Use computed property instead of maxRetriesReached
    const hasMaxRetriesReached = status.retryCount >= constants.RETRY_MAX;
    
    if (hasMaxRetriesReached) {
      console.error(`[Realtime] Error with ${channelName} subscription: Max retries reached for ${channelName}`);
      this.channels.set(channelName, status);
      this.updateGlobalStatus();
      return;
    }

    const delay = Math.min(
      constants.RETRY_DELAY_BASE * Math.pow(1.5, status.retryCount),
      15000
    );

    console.log(`[Realtime] Reconnecting ${channelName} in ${delay}ms (attempt ${status.retryCount + 1}/${constants.RETRY_MAX})`);

    if (status.retryTimeout) {
      clearTimeout(status.retryTimeout);
    }

    status.retryTimeout = setTimeout(() => {
      this.reconnect(channelName);
    }, delay);

    this.channels.set(channelName, status);
    this.updateGlobalStatus();
  }

  public reconnect(channelName: string): void {
    const status = this.channels.get(channelName);
    if (!status) return;

    if (status.channel) {
      supabase.removeChannel(status.channel);
    }

    status.retryCount++;
    
    // Check if we've reached max retries using computation
    const hasMaxRetriesReached = status.retryCount >= constants.RETRY_MAX;
    
    if (hasMaxRetriesReached) {
      console.error(`[Realtime] Max retry attempts reached for ${channelName}`);
      return;
    }

    // Recreate the channel with the same name
    // For now this is a placeholder as we don't store initial options
    const channel = supabase.channel(channelName);
    status.channel = channel;

    this.channels.set(channelName, status);

    // Resubscribe
    channel.subscribe();
  }

  public reconnectAll(): void {
    for (const channelName of this.channels.keys()) {
      this.reconnect(channelName);
    }
  }

  public unsubscribe(channelName: string): void {
    const status = this.channels.get(channelName);
    if (!status) return;

    if (status.retryTimeout) {
      clearTimeout(status.retryTimeout);
    }

    if (status.channel) {
      supabase.removeChannel(status.channel);
    }

    this.channels.delete(channelName);
    this.updateGlobalStatus();
  }

  public unsubscribeAll(): void {
    for (const channelName of this.channels.keys()) {
      this.unsubscribe(channelName);
    }
  }

  private updateGlobalStatus(): void {
    // Check if any channel is active
    let anyActive = false;
    
    // If no channels, assume connected
    if (this.channels.size === 0) {
      anyActive = true;
    } else {
      for (const status of this.channels.values()) {
        if (status.isActive) {
          anyActive = true;
          break;
        }
      }
    }

    // Only emit event if status changed
    if (anyActive !== this.globalStatus.isConnected) {
      this.globalStatus.isConnected = anyActive;
      
      if (anyActive) {
        this.globalStatus.lastConnected = Date.now();
      }
      
      this.eventEmitter.emit('connection_status_change', anyActive);
    }
  }

  public isConnected(): boolean {
    return this.globalStatus.isConnected;
  }
}
