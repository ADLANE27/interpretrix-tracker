
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { subscriptionRegistry } from './registry/subscriptionRegistry';
import { ConnectionMonitor } from './connectionMonitor';
import { CONNECTION_STATUS_DEBOUNCE_TIME } from './constants';
import { EventDebouncer } from './eventDebouncer';

// Create our connection monitor
const connectionStatusDebouncer = new EventDebouncer(CONNECTION_STATUS_DEBOUNCE_TIME);

/**
 * Core service for managing realtime subscriptions
 */
class RealtimeService {
  private connectionMonitor: ConnectionMonitor | null = null;
  private initialized: boolean = false;

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
    });
  }
  
  /**
   * Handle subscription retry
   */
  private handleSubscriptionRetry(key: string): void {
    console.log(`[RealtimeService] Retry subscription: ${key}`);
    
    if (key.startsWith('interpreter-status-')) {
      const interpreterId = key.replace('interpreter-status-', '');
      this.subscribeToInterpreterStatus(interpreterId);
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
            this.handleConnectionStatusChange(this.isConnected());
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
