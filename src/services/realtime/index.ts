import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { createInterpreterStatusSubscription } from './interpreterSubscriptions';
import { EventDebouncer } from './eventDebouncer';
import { ConnectionMonitor } from './connectionMonitor';
import { SubscriptionRegistry } from './registry/subscriptionRegistry';
import { Profile } from '@/types/profile';
import { v4 as uuidv4 } from 'uuid';

class RealtimeService {
  private subscriptions: Map<string, () => void> = new Map();
  private interpreterSubscriptions: Map<string, () => void> = new Map();
  private eventDebouncer: EventDebouncer;
  private connectionMonitor: ConnectionMonitor | null = null;
  private initialized: boolean = false;
  private lastEventIds: Map<string, string> = new Map();
  private errorCount: Map<string, number> = new Map();
  private MAX_ERROR_COUNT = 5;
  private reconnectInProgress: boolean = false;

  constructor() {
    this.eventDebouncer = new EventDebouncer();
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isConnected(): boolean {
    return this.connectionMonitor?.isConnectionHealthy() || false;
  }

  public init(): () => void {
    if (this.initialized) {
      console.log('[RealtimeService] Already initialized');
      return () => {};
    }

    console.log('[RealtimeService] Initializing');
    this.initialized = true;

    // Start connection monitoring
    this.connectionMonitor = new ConnectionMonitor(
      (key) => {
        console.log(`[RealtimeService] Retrying subscription for ${key}`);
        if (key.startsWith('interpreter-status-')) {
          const interpreterId = key.replace('interpreter-status-', '');
          this.subscribeToInterpreterStatus(interpreterId);
        }
      },
      (connected) => {
        console.log(`[RealtimeService] Connection status changed: ${connected}`);
        eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, connected);
        
        // When connection is restored, refresh all subscriptions
        if (connected && this.interpreterSubscriptions.size > 0) {
          console.log('[RealtimeService] Connection restored, refreshing all subscriptions');
          // Use a slight delay to avoid immediate reconnection attempts
          setTimeout(() => this.reconnectAll(), 1000);
        }
      }
    );
    this.connectionMonitor.start();

    return () => {
      this.cleanup();
    };
  }

  public reconnectAll(): void {
    if (this.reconnectInProgress) {
      console.log('[RealtimeService] Reconnection already in progress, skipping');
      return;
    }
    
    this.reconnectInProgress = true;
    console.log('[RealtimeService] Forcing reconnection for all subscriptions');
    
    // Clear error counters when doing a full reconnect
    this.errorCount.clear();
    
    // Reset all active Supabase channels after a brief delay
    // This prevents multiple rapid reconnect attempts
    setTimeout(() => {
      try {
        supabase.removeAllChannels();
        
        // Rebuild all active interpreter subscriptions
        const interpreterIds = Array.from(this.interpreterSubscriptions.keys())
          .map(key => key.replace('interpreter-status-', ''));
        
        interpreterIds.forEach(interpreterId => {
          console.log(`[RealtimeService] Resubscribing to interpreter ${interpreterId}`);
          this.subscribeToInterpreterStatus(interpreterId);
        });
        
        // Emit connection change event to trigger UI updates
        eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, true);
      } finally {
        this.reconnectInProgress = false;
      }
    }, 1000);
  }

  public subscribeToInterpreterStatus(interpreterId: string): () => void {
    if (!interpreterId) {
      console.warn('[RealtimeService] Cannot subscribe to interpreter status: No interpreterId provided');
      return () => {};
    }
    
    const subscriptionKey = `interpreter-status-${interpreterId}`;
    
    // Check if we already have an active subscription
    if (this.interpreterSubscriptions.has(subscriptionKey)) {
      console.log(`[RealtimeService] Reusing existing interpreter status subscription: ${interpreterId}`);
      return this.interpreterSubscriptions.get(subscriptionKey)!;
    }
    
    console.log(`[RealtimeService] Creating new subscription for interpreter status: ${interpreterId}`);
    
    // Create a new subscription
    const [cleanup, key, channel] = createInterpreterStatusSubscription(
      interpreterId,
      this.eventDebouncer,
      // Pass callback to handle status changes
      (newStatus) => {
        console.log(`[RealtimeService] Status changed to ${newStatus} for interpreter ${interpreterId}`);
        
        // Generate a unique event ID
        const eventId = uuidv4();
        this.lastEventIds.set(interpreterId, eventId);
        
        // Global immediate broadcast for UI updates
        eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
          interpreterId, 
          status: newStatus,
          timestamp: Date.now(),
          uuid: eventId
        });
        
        // Send a second broadcast with a brief delay to ensure it propagates
        setTimeout(() => {
          eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
            interpreterId, 
            status: newStatus,
            timestamp: Date.now(), 
            uuid: `${eventId}-followup`
          });
        }, 100);
      }
    );
    
    // Store the cleanup function
    this.interpreterSubscriptions.set(subscriptionKey, cleanup);
    
    return cleanup;
  }

  /**
   * Update an interpreter's status directly (optimistic update)
   */
  public broadcastStatusUpdate(interpreterId: string, status: Profile['status']): void {
    console.log(`[RealtimeService] Broadcasting status update for ${interpreterId}: ${status}`);
    
    // Generate a unique ID for this update to prevent duplicate processing
    const updateId = uuidv4();
    this.lastEventIds.set(interpreterId, updateId);
    
    // Immediate broadcast with minimal delay to ensure event is processed
    setTimeout(() => {
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status,
        timestamp: Date.now(),
        uuid: updateId 
      });
    }, 0);
    
    // Send a second broadcast after a short delay to ensure it propagates
    // This helps in cases where components might have missed the first event
    setTimeout(() => {
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status,
        timestamp: Date.now(),
        uuid: `${updateId}-followup`
      });
    }, 100);
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
    console.log(`[RealtimeService] Subscribing to table ${table} for ${event} events`);
    
    const filterSuffix = filter ? `-${filter.replace(/[^a-z0-9]/gi, '')}` : '';
    const key = `table-${table}-${event}${filterSuffix}`;
    
    // Check if we already have this subscription
    if (this.subscriptions.has(key)) {
      console.log(`[RealtimeService] Reusing existing subscription for ${key}`);
      return this.subscriptions.get(key) || (() => {});
    }
    
    // Track errors for this subscription
    let errorCount = this.errorCount.get(key) || 0;
    
    try {
      // If we've exceeded the maximum error count for this subscription, back off
      if (errorCount >= this.MAX_ERROR_COUNT) {
        console.log(`[RealtimeService] Max error count reached for ${key}, using error handler only`);
        
        // Return a dummy cleanup function that just resets the error count
        return () => {
          this.errorCount.set(key, 0);
        };
      }
      
      const instanceId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
      const channel = supabase.channel(`${key}-${instanceId}`)
        .on('postgres_changes' as any, {
          event: event,
          schema: 'public',
          table: table,
          filter: filter || undefined
        }, (payload) => {
          try {
            const now = Date.now();
            const eventId = `${table}-${event}-${now}`;
            
            // Reset error count on successful events
            this.errorCount.set(key, 0);
            
            if (this.eventDebouncer.shouldProcessEvent(eventId, now)) {
              console.log(`[RealtimeService] ${event} event on ${table}:`, payload);
              callback(payload);
            }
          } catch (error) {
            // If the callback throws, increment error count but don't fail the subscription
            console.error(`[RealtimeService] Error processing event for ${key}:`, error);
            this.errorCount.set(key, (this.errorCount.get(key) || 0) + 1);
          }
        })
        .subscribe((status) => {
          console.log(`[RealtimeService] Subscription status for ${key}: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            // Reset error count on successful subscription
            this.errorCount.set(key, 0);
            
            // Update connection monitor
            if (this.connectionMonitor) {
              this.connectionMonitor.updateChannelStatus(key, true);
            }
          } else if (status === 'CHANNEL_ERROR') {
            // Increment error count on channel errors
            this.errorCount.set(key, (this.errorCount.get(key) || 0) + 1);
            
            // Update connection monitor
            if (this.connectionMonitor) {
              this.connectionMonitor.updateChannelStatus(key, false);
            }
          }
        });
      
      // Create cleanup function
      const cleanup = () => {
        console.log(`[RealtimeService] Unsubscribing from ${key}`);
        supabase.removeChannel(channel);
        this.subscriptions.delete(key);
      };
      
      // Store in our subscriptions map
      this.subscriptions.set(key, cleanup);
      
      return cleanup;
    } catch (error) {
      console.error(`[RealtimeService] Error creating subscription: ${error}`);
      
      // Increment error count on subscription creation errors
      this.errorCount.set(key, (this.errorCount.get(key) || 0) + 1);
      
      return () => {
        this.errorCount.set(key, 0);
      };
    }
  }

  private cleanup(): void {
    console.log('[RealtimeService] Cleaning up');
    
    // Clean up connection monitor
    if (this.connectionMonitor) {
      this.connectionMonitor.stop();
      this.connectionMonitor = null;
    }
    
    // Clean up all subscriptions
    this.subscriptions.forEach(cleanup => cleanup());
    this.subscriptions.clear();
    
    this.interpreterSubscriptions.forEach(cleanup => cleanup());
    this.interpreterSubscriptions.clear();
    
    this.initialized = false;
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();
