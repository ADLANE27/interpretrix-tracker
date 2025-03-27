
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
  private isOnline = navigator.onLine;
  private subscriptionManager: SubscriptionManager;
  private connectionMonitor: ConnectionMonitor;
  private eventDebouncer: EventDebouncer;
  private visibilityChangeTimeout: NodeJS.Timeout | null = null;
  private networkStateChangeTimeout: NodeJS.Timeout | null = null;
  
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
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Initial status check
    this.isOnline = navigator.onLine;
    
    return () => {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.cleanup();
    };
  }
  
  private handleOnline = () => {
    console.log('[RealtimeService] Network online event received');
    
    // Debounce network state changes to avoid multiple rapid reconnections
    if (this.networkStateChangeTimeout) {
      clearTimeout(this.networkStateChangeTimeout);
    }
    
    this.networkStateChangeTimeout = setTimeout(() => {
      console.log('[RealtimeService] Network online, reconnecting all channels');
      this.reconnectAll();
      this.updateConnectionStatus(true);
      this.networkStateChangeTimeout = null;
    }, 1000); // Debounce network events by 1 second
  }
  
  private handleOffline = () => {
    console.log('[RealtimeService] Network offline event received');
    
    // Debounce network state changes
    if (this.networkStateChangeTimeout) {
      clearTimeout(this.networkStateChangeTimeout);
    }
    
    this.networkStateChangeTimeout = setTimeout(() => {
      console.log('[RealtimeService] Network offline confirmed');
      this.updateConnectionStatus(false);
      this.networkStateChangeTimeout = null;
    }, 1000); // Debounce network events by 1 second
  }
  
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('[RealtimeService] Document became visible');
      
      // Debounce visibility changes to prevent unnecessary reconnections
      if (this.visibilityChangeTimeout) {
        clearTimeout(this.visibilityChangeTimeout);
      }
      
      this.visibilityChangeTimeout = setTimeout(() => {
        console.log('[RealtimeService] Checking connection status after visibility change');
        
        // Check current Supabase channels state
        const channels = supabase.getChannels();
        const hasActiveChannels = channels.some(channel => channel.state === 'joined');
        
        if (!hasActiveChannels) {
          console.log('[RealtimeService] No active channels after visibility change, reconnecting');
          this.reconnectAll();
        } else {
          console.log('[RealtimeService] Found active channels, connection is working');
        }
        
        this.visibilityChangeTimeout = null;
      }, 2000); // Wait 2 seconds after visibility change before checking connection
    }
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
    console.log('[RealtimeService] Manually reconnecting all channels');
    this.connectionMonitor.reconnectAll();
  }
  
  public cleanup() {
    console.log('[RealtimeService] Cleaning up all subscriptions');
    
    this.connectionMonitor.stop();
    this.subscriptionManager.cleanupAll();
    this.isInitialized = false;
    
    if (this.visibilityChangeTimeout) {
      clearTimeout(this.visibilityChangeTimeout);
      this.visibilityChangeTimeout = null;
    }
    
    if (this.networkStateChangeTimeout) {
      clearTimeout(this.networkStateChangeTimeout);
      this.networkStateChangeTimeout = null;
    }
  }
  
  // Method to check if realtime service is connected
  public isConnected() {
    return this.isOnline;
  }
}

export const realtimeService = RealtimeService.getInstance();
