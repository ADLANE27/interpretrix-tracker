
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter } from '@/lib/events';
import { ConnectionMonitor } from './connectionMonitor';
import { createTableSubscription } from './tableSubscriptions';

class RealtimeService {
  private connectionMonitor: ConnectionMonitor;
  private initialized: boolean = false;

  constructor() {
    this.connectionMonitor = new ConnectionMonitor(eventEmitter);
  }

  public init() {
    console.log('[RealtimeService] Initializing');
    this.initialized = true;
    return () => this.cleanup();
  }

  public cleanup() {
    console.log('[RealtimeService] Cleaning up');
    this.connectionMonitor.unsubscribeAll();
  }

  public isConnected(): boolean {
    return this.connectionMonitor.isConnected();
  }

  public reconnectAll(): void {
    this.connectionMonitor.reconnectAll();
  }

  public subscribeToInterpreterStatus(interpreterId: string) {
    this.connectionMonitor.subscribe(`interpreter-status-${interpreterId}`, {
      config: {
        broadcast: { self: true }
      }
    });
  }

  // Add the subscribeToTable method
  public subscribeToTable(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    filter: string | null,
    callback: (payload: any) => void
  ): () => void {
    const [cleanup] = createTableSubscription(
      table,
      event,
      filter,
      callback,
      { debounce: (fn) => fn() } // Simple pass-through implementation
    );
    return cleanup;
  }

  // Add more service methods as needed
}

export const realtimeService = new RealtimeService();
