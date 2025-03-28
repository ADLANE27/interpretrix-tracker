
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
    console.log(`[RealtimeService] Broadcasting status update for ${interpreterId}: ${status}`);
    
    // Immediate broadcast
    eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
      interpreterId,
      status,
      timestamp: Date.now(),
      uuid: uuidv4() // Add unique ID to ensure event is always processed
    });
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
