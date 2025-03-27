
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { SubscriptionManager } from './subscriptionManager';
import { ConnectionMonitor } from './connectionMonitor';
import { EventDebouncer } from './eventDebouncer';

/**
 * Centralized service to manage all Supabase realtime subscriptions
 */
class RealtimeService {
  private static instance: RealtimeService;
  private isInitialized = false;
  private subscriptionManager: SubscriptionManager;
  private connectionMonitor: ConnectionMonitor;
  private eventDebouncer: EventDebouncer;
  
  private constructor() {
    this.subscriptionManager = new SubscriptionManager();
    this.connectionMonitor = new ConnectionMonitor(
      () => this.reconnectAll(),
      (connected) => eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, connected)
    );
    this.eventDebouncer = new EventDebouncer();
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  public init() {
    if (this.isInitialized) return () => {};
    
    console.log('[RealtimeService] Initializing');
    this.connectionMonitor.start();
    this.isInitialized = true;
    
    // Setup global connection status handling
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    return () => {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      this.cleanup();
    };
  }
  
  private handleOnline = () => {
    console.log('[RealtimeService] Network online, reconnecting all channels');
    this.reconnectAll();
    eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, true);
  }
  
  private handleOffline = () => {
    console.log('[RealtimeService] Network offline');
    eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, false);
  }

  public subscribeToInterpreterStatus = (interpreterId: string, onStatusChange?: (status: any) => void) => {
    return this.subscriptionManager.createInterpreterStatusSubscription(
      interpreterId, 
      onStatusChange,
      this.eventDebouncer
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
    this.subscriptionManager.reconnectAll();
  }
  
  public cleanup() {
    console.log('[RealtimeService] Cleaning up all subscriptions');
    
    this.connectionMonitor.stop();
    this.subscriptionManager.cleanupAll();
    this.isInitialized = false;
  }
}

export const realtimeService = RealtimeService.getInstance();
