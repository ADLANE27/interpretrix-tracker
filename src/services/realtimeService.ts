
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { Profile } from '@/types/profile';

// Constants for configuration
const RETRY_MAX = 5;
const RETRY_DELAY_BASE = 2000;
const CONNECTION_TIMEOUT = 30000;

interface SubscriptionStatus {
  connected: boolean;
  lastUpdate: Date;
  retryCount: number;
  channelRef: RealtimeChannel | null;
}

// Maintain a single source of truth for connection status
const subscriptionStatuses: Record<string, SubscriptionStatus> = {};

// Deduplicate events with a short cooldown period
const recentEvents = new Map<string, number>();
const EVENT_COOLDOWN = 500; // ms

/**
 * Centralized service to manage all Supabase realtime subscriptions
 */
class RealtimeService {
  private static instance: RealtimeService;
  private isInitialized = false;
  private connectionMonitorInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  public init() {
    if (this.isInitialized) return;
    
    console.log('[RealtimeService] Initializing');
    this.setupConnectionMonitor();
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

  private setupConnectionMonitor() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }
    
    this.connectionMonitorInterval = setInterval(() => {
      const now = Date.now();
      let hasActiveConnections = false;
      
      Object.entries(subscriptionStatuses).forEach(([key, status]) => {
        if (!status.connected) {
          // Try to reconnect stale connections
          if (status.retryCount < RETRY_MAX) {
            console.log(`[RealtimeService] Attempting reconnection for ${key}`);
            this.retrySubscription(key);
          }
        } else {
          // Check for stale but supposedly connected channels
          const timeSinceUpdate = now - status.lastUpdate.getTime();
          if (timeSinceUpdate > CONNECTION_TIMEOUT) {
            console.log(`[RealtimeService] Connection ${key} appears stale, marking as disconnected`);
            this.updateSubscriptionStatus(key, false);
          } else {
            hasActiveConnections = true;
          }
        }
      });
      
      // Update global connection status based on any active connection
      eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, hasActiveConnections);
      
    }, 10000); // Check every 10 seconds
  }

  private retrySubscription(key: string) {
    const status = subscriptionStatuses[key];
    if (!status) return;
    
    status.retryCount++;
    const delay = RETRY_DELAY_BASE * Math.pow(1.5, status.retryCount - 1);
    
    console.log(`[RealtimeService] Retry ${status.retryCount}/${RETRY_MAX} for ${key} in ${delay}ms`);
    
    setTimeout(() => {
      if (status.channelRef) {
        status.channelRef.subscribe();
      }
    }, delay);
  }

  /**
   * Subscribe to interpreter status changes
   * This is one of the most critical real-time features
   */
  public subscribeToInterpreterStatus(interpreterId: string, onStatusChange?: (status: Profile['status']) => void): () => void {
    const key = `interpreter-status-${interpreterId}`;
    
    // Clean up existing subscription if any
    this.unsubscribe(key);
    
    console.log(`[RealtimeService] Subscribing to interpreter status for ${interpreterId}`);
    
    const channel = supabase.channel(key)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'interpreter_profiles',
        filter: `id=eq.${interpreterId}`
      }, (payload) => {
        if (payload.new && payload.new.status) {
          // Avoid duplicate events within cooldown period
          const eventKey = `status-${interpreterId}-${payload.new.status}`;
          const now = Date.now();
          
          if (!this.shouldProcessEvent(eventKey, now)) {
            return;
          }
          
          console.log(`[RealtimeService] Status update for ${interpreterId}: ${payload.new.status}`);
          
          if (onStatusChange) {
            onStatusChange(payload.new.status as Profile['status']);
          }
          
          // Broadcast the event for other components
          eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
            interpreterId,
            status: payload.new.status
          });
        }
      })
      .subscribe((status) => {
        console.log(`[RealtimeService] Subscription status for ${key}: ${status}`);
        this.updateSubscriptionStatus(key, status === 'SUBSCRIBED', channel);
      });
    
    subscriptionStatuses[key] = {
      connected: false,
      lastUpdate: new Date(),
      retryCount: 0,
      channelRef: channel
    };
    
    return () => this.unsubscribe(key);
  }
  
  /**
   * Subscribe to a specific table with custom filtering
   */
  public subscribeToTable(
    table: string, 
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*', 
    filter: string | null,
    callback: (payload: any) => void
  ): () => void {
    const filterSuffix = filter ? `-${filter.replace(/[^a-z0-9]/gi, '')}` : '';
    const key = `table-${table}-${event}${filterSuffix}`;
    
    // Clean up existing subscription if any
    this.unsubscribe(key);
    
    console.log(`[RealtimeService] Subscribing to ${table} for ${event} events`);
    
    const channel = supabase.channel(key)
      .on('postgres_changes', {
        event: event,
        schema: 'public',
        table: table,
        filter: filter || undefined
      }, (payload) => {
        // Add timestamp to payload for debugging
        const enhancedPayload = {
          ...payload,
          receivedAt: new Date().toISOString()
        };
        
        console.log(`[RealtimeService] ${event} event on ${table}:`, enhancedPayload);
        callback(enhancedPayload);
      })
      .subscribe((status) => {
        console.log(`[RealtimeService] Subscription status for ${key}: ${status}`);
        this.updateSubscriptionStatus(key, status === 'SUBSCRIBED', channel);
      });
    
    subscriptionStatuses[key] = {
      connected: false,
      lastUpdate: new Date(),
      retryCount: 0,
      channelRef: channel
    };
    
    return () => this.unsubscribe(key);
  }
  
  private shouldProcessEvent(eventKey: string, now: number): boolean {
    const lastProcessed = recentEvents.get(eventKey);
    
    if (lastProcessed && now - lastProcessed < EVENT_COOLDOWN) {
      console.log(`[RealtimeService] Skipping duplicate event: ${eventKey}`);
      return false;
    }
    
    recentEvents.set(eventKey, now);
    
    // Clean up old entries
    if (recentEvents.size > 100) {
      const keysToDelete = [...recentEvents.entries()]
        .filter(([_, timestamp]) => now - timestamp > 10000)
        .map(([key]) => key);
        
      keysToDelete.forEach(key => recentEvents.delete(key));
    }
    
    return true;
  }
  
  private updateSubscriptionStatus(key: string, connected: boolean, channel?: RealtimeChannel) {
    const status = subscriptionStatuses[key];
    
    if (!status) {
      subscriptionStatuses[key] = {
        connected,
        lastUpdate: new Date(),
        retryCount: 0,
        channelRef: channel || null
      };
      return;
    }
    
    if (connected) {
      // Reset retry count on successful connection
      status.retryCount = 0;
    }
    
    status.connected = connected;
    status.lastUpdate = new Date();
    
    if (channel) {
      status.channelRef = channel;
    }
  }
  
  private unsubscribe(key: string) {
    const status = subscriptionStatuses[key];
    
    if (status && status.channelRef) {
      console.log(`[RealtimeService] Unsubscribing from ${key}`);
      supabase.removeChannel(status.channelRef);
      delete subscriptionStatuses[key];
    }
  }
  
  public reconnectAll() {
    console.log('[RealtimeService] Reconnecting all channels');
    
    Object.entries(subscriptionStatuses).forEach(([key, status]) => {
      if (status.channelRef) {
        console.log(`[RealtimeService] Reconnecting ${key}`);
        status.channelRef.subscribe();
      }
    });
  }
  
  public cleanup() {
    console.log('[RealtimeService] Cleaning up all subscriptions');
    
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
    
    Object.entries(subscriptionStatuses).forEach(([key, status]) => {
      if (status.channelRef) {
        supabase.removeChannel(status.channelRef);
      }
    });
    
    Object.keys(subscriptionStatuses).forEach(key => {
      delete subscriptionStatuses[key];
    });
    
    this.isInitialized = false;
  }
}

export const realtimeService = RealtimeService.getInstance();
