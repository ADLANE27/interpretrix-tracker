
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';
import { EventDebouncer } from './eventDebouncer';
import { SubscriptionStatus, createSubscriptionStatus } from './types';
import { Profile } from '@/types/profile';

export class SubscriptionManager {
  private subscriptionStatuses: Record<string, SubscriptionStatus> = {};
  
  public createInterpreterStatusSubscription(
    interpreterId: string, 
    onStatusChange?: (status: Profile['status']) => void,
    eventDebouncer: EventDebouncer
  ): () => void {
    const key = `interpreter-status-${interpreterId}`;
    
    // Clean up existing subscription if any
    this.unsubscribe(key);
    
    console.log(`[RealtimeService] Subscribing to interpreter status for ${interpreterId}`);
    
    const channel = supabase.channel(key)
      .on('postgres_changes' as any, {
        event: 'UPDATE',
        schema: 'public',
        table: 'interpreter_profiles',
        filter: `id=eq.${interpreterId}`
      }, (payload) => {
        if (payload.new && payload.new.status) {
          // Avoid duplicate events within cooldown period
          const eventKey = `status-${interpreterId}-${payload.new.status}`;
          const now = Date.now();
          
          if (!eventDebouncer.shouldProcessEvent(eventKey, now)) {
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
    
    this.subscriptionStatuses[key] = createSubscriptionStatus(channel);
    
    return () => this.unsubscribe(key);
  }
  
  public createTableSubscription(
    table: string, 
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*', 
    filter: string | null,
    callback: (payload: any) => void,
    eventDebouncer: EventDebouncer
  ): () => void {
    const filterSuffix = filter ? `-${filter.replace(/[^a-z0-9]/gi, '')}` : '';
    const key = `table-${table}-${event}${filterSuffix}`;
    
    // Clean up existing subscription if any
    this.unsubscribe(key);
    
    console.log(`[RealtimeService] Subscribing to ${table} for ${event} events`);
    
    const channel = supabase.channel(key)
      .on('postgres_changes' as any, {
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
    
    this.subscriptionStatuses[key] = createSubscriptionStatus(channel);
    
    return () => this.unsubscribe(key);
  }
  
  public updateSubscriptionStatus(key: string, connected: boolean, channel?: RealtimeChannel) {
    const status = this.subscriptionStatuses[key];
    
    if (!status) {
      this.subscriptionStatuses[key] = createSubscriptionStatus(channel);
      this.subscriptionStatuses[key].connected = connected;
      this.subscriptionStatuses[key].lastUpdate = new Date();
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
  
  public unsubscribe(key: string) {
    const status = this.subscriptionStatuses[key];
    
    if (status && status.channelRef) {
      console.log(`[RealtimeService] Unsubscribing from ${key}`);
      supabase.removeChannel(status.channelRef);
      delete this.subscriptionStatuses[key];
    }
  }
  
  public reconnectAll() {
    Object.entries(this.subscriptionStatuses).forEach(([key, status]) => {
      if (status.channelRef) {
        console.log(`[RealtimeService] Reconnecting ${key}`);
        status.channelRef.subscribe();
      }
    });
  }
  
  public getStatus(key: string): SubscriptionStatus | undefined {
    return this.subscriptionStatuses[key];
  }
  
  public getAllStatuses(): Record<string, SubscriptionStatus> {
    return { ...this.subscriptionStatuses };
  }
  
  public cleanupAll() {
    Object.entries(this.subscriptionStatuses).forEach(([key, status]) => {
      if (status.channelRef) {
        supabase.removeChannel(status.channelRef);
      }
    });
    
    Object.keys(this.subscriptionStatuses).forEach(key => {
      delete this.subscriptionStatuses[key];
    });
  }
}
