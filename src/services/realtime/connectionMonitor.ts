
/**
 * A class to monitor the connection status of Supabase realtime channels
 */
export class ConnectionMonitor {
  private channelStatuses: Map<string, boolean> = new Map();
  private retryCallbacks: Map<string, () => void> = new Map();
  private isHealthy: boolean = true;
  private connectionStatusCallback: (isHealthy: boolean) => void;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private monitoringStartTime: number = 0;

  constructor(
    retryCallback: (key: string) => void,
    connectionStatusCallback: (isHealthy: boolean) => void
  ) {
    this.connectionStatusCallback = connectionStatusCallback;
    
    // Set up a shared retry callback that will be reused for all channels
    const createRetryCallback = (key: string) => {
      return () => {
        console.log(`[ConnectionMonitor] Triggering retry for ${key}`);
        retryCallback(key);
      };
    };
    
    // Store the callback factory for later use
    this.createRetryCallback = createRetryCallback;
  }

  private createRetryCallback: (key: string) => () => void;

  public start(): void {
    if (this.monitoringInterval) {
      console.log('[ConnectionMonitor] Already started');
      return;
    }
    
    console.log('[ConnectionMonitor] Starting connection monitoring');
    this.monitoringStartTime = Date.now();
    
    this.monitoringInterval = setInterval(() => {
      this.checkConnection();
    }, 10000); // Check every 10 seconds
  }

  public stop(): void {
    console.log('[ConnectionMonitor] Stopping connection monitoring');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.channelStatuses.clear();
    this.retryCallbacks.clear();
  }

  public isConnectionHealthy(): boolean {
    return this.isHealthy;
  }

  public updateChannelStatus(key: string, isConnected: boolean): void {
    const previousStatus = this.channelStatuses.get(key);
    console.log(`[ConnectionMonitor] Channel ${key} status update: ${isConnected}`);
    
    this.channelStatuses.set(key, isConnected);
    
    // If the status changed from connected to disconnected, maybe trigger a retry
    if (previousStatus === true && isConnected === false) {
      console.log(`[ConnectionMonitor] Channel ${key} disconnected`);
      
      // Create a retry callback if it doesn't exist
      if (!this.retryCallbacks.has(key)) {
        this.retryCallbacks.set(key, this.createRetryCallback(key));
      }
    }
    
    // Recalculate overall health
    this.checkConnection();
  }

  private checkConnection(): void {
    // If we have no channels yet, consider the connection healthy
    if (this.channelStatuses.size === 0) {
      if (!this.isHealthy) {
        console.log('[ConnectionMonitor] No channels to monitor, assuming connection is healthy');
        this.isHealthy = true;
        this.connectionStatusCallback(true);
      }
      return;
    }
    
    // Check if any channel is still connected
    let anyConnected = false;
    for (const [key, isConnected] of this.channelStatuses.entries()) {
      if (isConnected) {
        anyConnected = true;
        break;
      }
    }
    
    // Update the health status if it changed
    if (this.isHealthy !== anyConnected) {
      console.log(`[ConnectionMonitor] Connection health changed: ${anyConnected}`);
      this.isHealthy = anyConnected;
      this.connectionStatusCallback(anyConnected);
      
      // If connection was restored, clear retry timeouts
      if (anyConnected) {
        for (const key of this.retryCallbacks.keys()) {
          console.log(`[ConnectionMonitor] Connection restored, clearing retry for ${key}`);
        }
      }
    }
  }
}
