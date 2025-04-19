
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { createInterpreterStatusSubscription } from './interpreterSubscriptions';
import { EventDebouncer } from './eventDebouncer';
import { ConnectionMonitor } from './connectionMonitor';
import { SubscriptionRegistry } from './registry/subscriptionRegistry';
import { Profile } from '@/types/profile';
import { v4 as uuidv4 } from 'uuid';

// Global registry to track active subscriptions to prevent duplicates
const subscriptionsRegistry = new Map<string, { count: number, cleanup: () => void }>();

class RealtimeService {
  private subscriptions: Map<string, () => void> = new Map();
  private interpreterSubscriptions: Map<string, () => void> = new Map();
  private eventDebouncer: EventDebouncer;
  private connectionMonitor: ConnectionMonitor | null = null;
  private initialized: boolean = false;

  constructor() {
    this.eventDebouncer = new EventDebouncer();
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isConnected(): boolean {
    return this.connectionMonitor?.isConnected() || false;
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
      }
    );
    this.connectionMonitor.start();

    return () => {
      this.cleanup();
    };
  }

  public reconnectAll(): void {
    console.log('[RealtimeService] Forcing reconnection for all subscriptions');
    
    // Reset all active Supabase channels
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
  }

  public subscribeToInterpreterStatus(interpreterId: string): () => void {
    if (!interpreterId) {
      console.warn('[RealtimeService] Cannot subscribe to interpreter status: No interpreterId provided');
      return () => {};
    }
    
    const subscriptionKey = `interpreter-status-${interpreterId}`;
    
    // Check if we already have an active subscription
    if (this.interpreterSubscriptions.has(subscriptionKey)) {
      return this.interpreterSubscriptions.get(subscriptionKey)!;
    }
    
    // Create a new subscription
    const [cleanup, key, channel] = createInterpreterStatusSubscription(
      interpreterId,
      this.eventDebouncer,
      // Pass callback to handle status changes
      (newStatus) => {
        // Global immediate broadcast for UI updates
        eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
          interpreterId, 
          status: newStatus,
          timestamp: Date.now(),
          uuid: uuidv4() // Add unique ID to prevent event deduplication issues
        });
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
    // Generate a unique ID for this update to prevent duplicate processing
    const updateId = uuidv4();
    
    // Immediate broadcast with minimal delay to ensure event is processed
    setTimeout(() => {
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status,
        timestamp: Date.now(),
        uuid: updateId 
      });
    }, 0);
  }

  /**
   * Subscribe to table changes with shared subscription support
   */
  public subscribeToTable(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    filter: string | null,
    callback: (payload: any) => void
  ): () => void {
    const filterSuffix = filter ? `-${filter.replace(/[^a-z0-9]/gi, '')}` : '';
    const key = `table-${table}-${event}${filterSuffix}`;
    
    // Check if we already have this subscription registered
    if (subscriptionsRegistry.has(key)) {
      const existing = subscriptionsRegistry.get(key)!;
      existing.count++;
      
      // Return a cleanup function that decrements the reference count
      return () => {
        const current = subscriptionsRegistry.get(key);
        if (current) {
          current.count--;
          if (current.count <= 0) {
            current.cleanup();
            subscriptionsRegistry.delete(key);
          }
        }
      };
    }
    
    try {
      const channel = supabase.channel(key)
        .on('postgres_changes' as any, {
          event: event,
          schema: 'public',
          table: table,
          filter: filter || undefined
        }, (payload) => {
          // Use the debouncer to prevent duplicate event processing
          const now = Date.now();
          const eventId = `${table}-${event}-${
            (payload.new as any)?.id || 
            (payload.old as any)?.id || 
            now
          }`;
          
          if (this.eventDebouncer.shouldProcessEvent(eventId, now)) {
            callback(payload);
          }
        })
        .subscribe();
      
      // Create cleanup function
      const cleanup = () => {
        supabase.removeChannel(channel);
        this.subscriptions.delete(key);
        subscriptionsRegistry.delete(key);
      };
      
      // Store in our registries
      this.subscriptions.set(key, cleanup);
      subscriptionsRegistry.set(key, { count: 1, cleanup });
      
      // Return a reference-counted cleanup function
      return () => {
        const current = subscriptionsRegistry.get(key);
        if (current) {
          current.count--;
          if (current.count <= 0) {
            current.cleanup();
            subscriptionsRegistry.delete(key);
          }
        }
      };
    } catch (error) {
      console.error(`[RealtimeService] Error creating subscription: ${error}`);
      return () => {};
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
    
    // Clean up global registry
    subscriptionsRegistry.forEach(subscription => subscription.cleanup());
    subscriptionsRegistry.clear();
    
    this.initialized = false;
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();
