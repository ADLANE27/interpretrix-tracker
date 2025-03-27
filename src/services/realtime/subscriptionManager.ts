
import { EventDebouncer } from './eventDebouncer';
import { Profile } from '@/types/profile';
import { subscriptionRegistry } from './subscriptionRegistry';
import { createInterpreterStatusSubscription } from './interpreterSubscriptions';
import { createTableSubscription } from './tableSubscriptions';

/**
 * Manages all realtime subscriptions
 */
export class SubscriptionManager {
  public createInterpreterStatusSubscription(
    interpreterId: string, 
    eventDebouncer: EventDebouncer,
    onStatusChange?: (status: Profile['status']) => void
  ): () => void {
    // Clean up existing subscription if any
    this.unsubscribe(`interpreter-status-${interpreterId}`);
    
    const [unsubscribe, key, channel] = createInterpreterStatusSubscription(
      interpreterId,
      eventDebouncer,
      onStatusChange
    );
    
    // Register the new subscription
    subscriptionRegistry.register(key, channel);
    
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
    
    const [unsubscribe, subscriptionKey, channel] = createTableSubscription(
      table,
      event,
      filter,
      callback,
      eventDebouncer
    );
    
    // Register the new subscription
    subscriptionRegistry.register(key, channel);
    
    return () => this.unsubscribe(key);
  }
  
  public updateSubscriptionStatus(key: string, connected: boolean, channel?: any): void {
    subscriptionRegistry.updateStatus(key, connected, channel);
  }
  
  public unsubscribe(key: string): void {
    subscriptionRegistry.unregister(key);
  }
  
  public reconnectAll(): void {
    subscriptionRegistry.reconnectAll();
  }
  
  public getStatus(key: string): any {
    return subscriptionRegistry.getStatus(key);
  }
  
  public getAllStatuses(): any {
    return subscriptionRegistry.getAllStatuses();
  }
  
  public cleanupAll(): void {
    subscriptionRegistry.cleanupAll();
  }
}
