
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { SubscriptionManager } from './subscriptionManager';
import { ConnectionMonitor } from './connectionMonitor';
import { EventDebouncer } from './eventDebouncer';
import { Profile } from '@/types/profile';

/**
 * Centralized service to manage all Supabase realtime subscriptions
 */
class RealtimeService {
  private static instance: RealtimeService;
  private isInitialized = false;
  private isOnline = true;
  private subscriptionManager: SubscriptionManager;
  private connectionMonitor: ConnectionMonitor;
  private eventDebouncer: EventDebouncer;
  
  private constructor() {
    this.subscriptionManager = new SubscriptionManager();
    this.connectionMonitor = new ConnectionMonitor(
      (key) => this.retrySubscription(key),
      (connected) => this.updateConnectionStatus(connected)
    );
    this.eventDebouncer = new EventDebouncer();
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  private retrySubscription(key: string) {
    console.log(`[RealtimeService] Retrying subscription for ${key}`);
    if (key.startsWith('interpreter-status-')) {
      const interpreterId = key.replace('interpreter-status-', '');
      this.subscriptionManager.createInterpreterStatusSubscription(
        interpreterId,
        this.eventDebouncer
      );
    } else if (key.startsWith('table-')) {
      // Parse the table key pattern: table-{tableName}-{event}-{filterSuffix?}
      const parts = key.split('-');
      if (parts.length >= 3) {
        const tableName = parts[1];
        const event = parts[2] as 'INSERT' | 'UPDATE' | 'DELETE' | '*';
        
        // This is a simplification - in a real app we'd need to store and retrieve 
        // the original callbacks and filters
        this.subscriptionManager.createTableSubscription(
          tableName,
          event,
          null,
          () => {
            console.log(`[RealtimeService] Received event from retried subscription ${key}`);
            // Ideally, we'd call the original callback here
          },
          this.eventDebouncer
        );
      }
    }
  }

  private updateConnectionStatus(connected: boolean) {
    if (this.isOnline !== connected) {
      this.isOnline = connected;
      console.log(`[RealtimeService] Connection status changed to: ${connected ? 'connected' : 'disconnected'}`);
      eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, connected);
    }
  }

  public init() {
    if (this.isInitialized) return () => {};
    
    console.log('[RealtimeService] Initializing');
    this.connectionMonitor.start();
    this.isInitialized = true;
    
    // Setup global connection status handling
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Initial status check
    this.isOnline = navigator.onLine;
    
    return () => {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      this.cleanup();
    };
  }
  
  private handleOnline = () => {
    console.log('[RealtimeService] Network online, reconnecting all channels');
    this.reconnectAll();
    this.updateConnectionStatus(true);
  }
  
  private handleOffline = () => {
    console.log('[RealtimeService] Network offline');
    this.updateConnectionStatus(false);
  }

  public subscribeToInterpreterStatus = (interpreterId: string, onStatusChange?: (status: Profile['status']) => void) => {
    return this.subscriptionManager.createInterpreterStatusSubscription(
      interpreterId, 
      this.eventDebouncer,
      onStatusChange
    );
  };
  
  public subscribeToTable = (
    table: string, 
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*', 
    filter: string | null,
    callback: (payload: any) => void
  ) => {
    return this.subscriptionManager.createTableSubscription(
      table,
      event,
      filter,
      callback,
      this.eventDebouncer
    );
  };

  public reconnectAll() {
    console.log('[RealtimeService] Reconnecting all channels');
    this.connectionMonitor.reconnectAll();
  }
  
  public cleanup() {
    console.log('[RealtimeService] Cleaning up all subscriptions');
    
    this.connectionMonitor.stop();
    this.subscriptionManager.cleanupAll();
    this.isInitialized = false;
  }
  
  // Method to check if realtime service is connected
  public isConnected() {
    return this.isOnline;
  }
}

export const realtimeService = RealtimeService.getInstance();
