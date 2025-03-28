
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { subscriptionRegistry } from './registry/subscriptionRegistry';
import { ConnectionMonitor } from './connectionMonitor';
import { CONNECTION_STATUS_DEBOUNCE_TIME, RETRY_MAX } from './constants';
import { EventDebouncer } from './eventDebouncer';
import { SubscriptionManager } from './subscriptionManager';

// Create our connection monitor
const connectionStatusDebouncer = new EventDebouncer(CONNECTION_STATUS_DEBOUNCE_TIME);
const subscriptionManager = new SubscriptionManager();

/**
 * Core service for managing realtime subscriptions
 */
class RealtimeService {
  private connectionMonitor: ConnectionMonitor | null = null;
  private initialized: boolean = false;
  private eventDebouncer: EventDebouncer;
  private activeSubscriptions: Map<string, () => void> = new Map();

  constructor() {
    this.eventDebouncer = new EventDebouncer();
  }

  /**
   * Initialize the realtime service
   */
  public init(): () => void {
    if (this.initialized) {
      console.log('[RealtimeService] Already initialized');
      return () => {};
    }

    console.log('[RealtimeService] Initializing');
    this.initialized = true;

    // Create connection monitor
    this.connectionMonitor = new ConnectionMonitor(
      (key) => this.handleSubscriptionRetry(key),
      (connected) => this.handleConnectionStatusChange(connected)
    );

    // Start monitoring
    this.connectionMonitor.start();

    // Return cleanup function
    return () => {
      this.cleanup();
    };
  }

  /**
   * Clean up all resources
   */
  private cleanup(): void {
    console.log('[RealtimeService] Cleaning up');
    if (this.connectionMonitor) {
      this.connectionMonitor.stop();
      this.connectionMonitor = null;
    }
    
    // Clean up all active subscriptions
    this.activeSubscriptions.forEach(cleanup => cleanup());
    this.activeSubscriptions.clear();
    
    subscriptionRegistry.cleanupAll();
    this.initialized = false;
  }
  
  /**
   * Handle connection status change
   */
  private handleConnectionStatusChange(connected: boolean): void {
    // Debounce connection status changes to prevent UI flickering
    connectionStatusDebouncer.debounce(() => {
      console.log(`[RealtimeService] Connection status changed: ${connected ? 'connected' : 'disconnected'}`);
      eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, connected);
    }, 'connection-status', CONNECTION_STATUS_DEBOUNCE_TIME);
  }
  
  /**
   * Handle subscription retry
   */
  private handleSubscriptionRetry(key: string): void {
    console.log(`[RealtimeService] Retry subscription: ${key}`);
    
    if (key.startsWith('interpreter-status-')) {
      const interpreterId = key.replace('interpreter-status-', '');
      this.subscribeToInterpreterStatus(interpreterId);
    } else if (key.startsWith('table-')) {
      // For table subscriptions, extract the table, event, and filter from the key
      const parts = key.split('-');
      if (parts.length >= 3) {
        const table = parts[1];
        const event = parts[2] as 'INSERT' | 'UPDATE' | 'DELETE' | '*';
        // Recreate the subscription from registry data
        const status = subscriptionRegistry.getStatus(key);
        if (status) {
          console.log(`[RealtimeService] Recreating table subscription for ${table}`);
          // We'll need to register a new channel since we can't extract the callback
          // This will be a placeholder that will be overridden when the user subscribes again
          subscriptionManager.createTableSubscription(
            table,
            event,
            null,
            (payload) => console.log(`[RealtimeService] Received update for ${table}`, payload),
            this.eventDebouncer
          );
        }
      }
    } else {
      console.warn(`[RealtimeService] Unknown subscription type: ${key}`);
    }
  }
  
  /**
   * Subscribe to interpreter status updates
   */
  public subscribeToInterpreterStatus(interpreterId: string): void {
    const subscriptionKey = `interpreter-status-${interpreterId}`;
    const existingStatus = subscriptionRegistry.getStatus(subscriptionKey);
    
    // Unsubscribe from existing subscription if any
    if (existingStatus && existingStatus.channelRef) {
      console.log(`[RealtimeService] Unsubscribing from existing interpreter status: ${interpreterId}`);
      try {
        supabase.removeChannel(existingStatus.channelRef);
      } catch (error) {
        console.error(`[RealtimeService] Error removing channel: ${error}`);
      }
    }
    
    console.log(`[RealtimeService] Subscribing to interpreter status: ${interpreterId}`);
    
    try {
      // Create a new channel
      const channel = supabase
        .channel(`interpreter-status-${interpreterId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'interpreter_profiles',
            filter: `id=eq.${interpreterId}`
          },
          (payload) => {
            console.log(`[RealtimeService] Received update for interpreter: ${interpreterId}`, payload);
            // Mark as active when we receive updates
            subscriptionRegistry.updateStatus(subscriptionKey, true);
          }
        )
        .subscribe((status) => {
          console.log(`[RealtimeService] Subscription status for interpreter ${interpreterId}: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            // Mark as connected when subscribed
            subscriptionRegistry.updateStatus(subscriptionKey, true);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
            // Mark as disconnected on errors
            subscriptionRegistry.updateStatus(subscriptionKey, false);
            
            // Let connection monitor know there was an error
            if (this.connectionMonitor) {
              this.handleConnectionStatusChange(this.connectionMonitor.isConnected());
            }
          }
        });
      
      // Register in our subscription registry
      subscriptionRegistry.register(subscriptionKey, channel);
    } catch (error) {
      console.error(`[RealtimeService] Error subscribing to interpreter status: ${error}`);
      subscriptionRegistry.updateStatus(subscriptionKey, false);
    }
  }
  
  /**
   * Subscribe to table changes
   */
  public subscribeToTable(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    filter: string | null,
    callback: (payload: any) => void
  ): () => void {
    // Make sure the service is initialized first
    if (!this.initialized) {
      this.init();
    }
    
    const filterSuffix = filter ? `-${filter.replace(/[^a-z0-9]/gi, '')}` : '';
    const subscriptionKey = `table-${table}-${event}${filterSuffix}`;
    
    // Check if we already have an active subscription
    if (this.activeSubscriptions.has(subscriptionKey)) {
      console.log(`[RealtimeService] Reusing existing subscription for ${subscriptionKey}`);
      return () => {};
    }
    
    console.log(`[RealtimeService] Creating new subscription for ${subscriptionKey}`);
    
    try {
      const cleanup = subscriptionManager.createTableSubscription(
        table,
        event,
        filter,
        callback,
        this.eventDebouncer
      );
      
      // Store in active subscriptions map
      this.activeSubscriptions.set(subscriptionKey, cleanup);
      
      // Return a cleanup function that removes from map
      return () => {
        cleanup();
        this.activeSubscriptions.delete(subscriptionKey);
      };
    } catch (error) {
      console.error(`[RealtimeService] Error creating subscription: ${error}`);
      return () => {};
    }
  }
  
  /**
   * Get the current connection status
   */
  public isConnected(): boolean {
    if (!this.connectionMonitor) {
      return false;
    }
    
    return this.connectionMonitor.isConnected();
  }
  
  /**
   * Reconnect all subscriptions
   */
  public reconnectAll(): void {
    if (!this.connectionMonitor) {
      this.init();
      return;
    }
    
    this.connectionMonitor.reconnectAll();
  }
}

// Create singleton instance
export const realtimeService = new RealtimeService();
