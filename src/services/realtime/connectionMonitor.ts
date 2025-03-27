
import { supabase } from '@/integrations/supabase/client';
import {
  RETRY_MAX,
  RETRY_DELAY_BASE,
  CONNECTION_TIMEOUT,
  RECONNECT_STAGGER_INTERVAL,
  RECONNECT_STAGGER_MAX_DELAY,
  RECONNECT_PERIODIC_INTERVAL
} from './constants';
import { EventDebouncer } from './eventDebouncer';
import { debounce } from '@/lib/utils';

// Class version for service usage
export class ConnectionMonitor {
  private retryCount: number = 0;
  private maxRetries: number = RETRY_MAX;
  private isReconnecting: boolean = false;
  private eventDebouncer: EventDebouncer;
  private reconnectTimeouts: NodeJS.Timeout[] = [];
  private onRetryCallback: (key: string) => void;
  private onConnectionStatusChange: (connected: boolean) => void;
  private isConnected: boolean = false;

  constructor(
    onRetryCallback: (key: string) => void,
    onConnectionStatusChange: (connected: boolean) => void
  ) {
    this.onRetryCallback = onRetryCallback;
    this.onConnectionStatusChange = onConnectionStatusChange;
    this.eventDebouncer = new EventDebouncer();
  }

  public start(): void {
    console.log('[ConnectionMonitor] Starting monitoring');
    this.checkSubscriptions();
    
    // Set up interval for periodic checks
    setInterval(() => {
      this.checkSubscriptions();
    }, RECONNECT_PERIODIC_INTERVAL);
  }

  public stop(): void {
    console.log('[ConnectionMonitor] Stopping monitoring');
    this.clearTimeouts();
  }

  public reconnectAll(): void {
    console.log('[ConnectionMonitor] Force reconnecting all subscriptions');
    
    if (this.isReconnecting) {
      console.log('[ConnectionMonitor] Already reconnecting, skipping request');
      return;
    }
    
    this.isReconnecting = true;
    this.retryCount = 0;
    
    // Clear any existing timeouts
    this.clearTimeouts();
    
    // Try to reconnect all channels
    setTimeout(() => {
      this.isReconnecting = false;
      this.checkSubscriptions();
    }, 1000);
  }

  private checkSubscriptions(): void {
    // Get all subscription statuses
    const subscriptions = this.getActiveSubscriptions();
    
    if (subscriptions.length === 0) {
      this.isConnected = true;
      this.onConnectionStatusChange(true);
      return;
    }
    
    const allConnected = subscriptions.every(sub => sub.connected);
    
    if (allConnected) {
      this.isConnected = true;
      this.onConnectionStatusChange(true);
      this.retryCount = 0;
      return;
    }
    
    this.isConnected = false;
    this.onConnectionStatusChange(false);
    
    // If we have reached max retries, don't attempt to reconnect
    if (this.retryCount >= this.maxRetries) {
      console.error('[ConnectionMonitor] Max retries reached, giving up');
      return;
    }
    
    // Try to reconnect disconnected subscriptions
    subscriptions
      .filter(sub => !sub.connected)
      .forEach(sub => {
        this.scheduleReconnect(sub.key);
      });
  }

  private scheduleReconnect(subscriptionKey: string): void {
    const delay = Math.min(
      RETRY_DELAY_BASE * Math.pow(2, this.retryCount),
      RECONNECT_STAGGER_MAX_DELAY
    );
    
    console.log(`[ConnectionMonitor] Scheduling reconnect for ${subscriptionKey} in ${delay}ms`);
    
    const timeout = setTimeout(() => {
      this.retryCount++;
      this.onRetryCallback(subscriptionKey);
    }, delay);
    
    this.reconnectTimeouts.push(timeout);
  }

  private clearTimeouts(): void {
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts = [];
  }

  private getActiveSubscriptions(): Array<{key: string, connected: boolean}> {
    // This would normally be retrieved from a registry, but for simplicity
    // we'll return an empty array
    return [];
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
