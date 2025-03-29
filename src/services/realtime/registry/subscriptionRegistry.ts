
/**
 * Helper class to track and manage Supabase realtime subscriptions
 */
export class SubscriptionRegistry {
  private subscriptions: Map<string, () => void> = new Map();

  /**
   * Register a new subscription
   */
  public register(key: string, cleanup: () => void): void {
    // If we already have a subscription with this key, clean it up first
    if (this.subscriptions.has(key)) {
      console.log(`[SubscriptionRegistry] Cleaning up existing subscription: ${key}`);
      this.unregister(key);
    }
    
    console.log(`[SubscriptionRegistry] Registering subscription: ${key}`);
    this.subscriptions.set(key, cleanup);
  }

  /**
   * Unregister and clean up a subscription
   */
  public unregister(key: string): void {
    const cleanup = this.subscriptions.get(key);
    
    if (cleanup) {
      console.log(`[SubscriptionRegistry] Unregistering subscription: ${key}`);
      cleanup();
      this.subscriptions.delete(key);
    }
  }

  /**
   * Clean up all subscriptions
   */
  public unregisterAll(): void {
    console.log(`[SubscriptionRegistry] Cleaning up all subscriptions (${this.subscriptions.size})`);
    
    this.subscriptions.forEach((cleanup, key) => {
      console.log(`[SubscriptionRegistry] Cleaning up subscription: ${key}`);
      cleanup();
    });
    
    this.subscriptions.clear();
  }

  /**
   * Get the number of active subscriptions
   */
  public get count(): number {
    return this.subscriptions.size;
  }

  /**
   * Check if a subscription exists
   */
  public has(key: string): boolean {
    return this.subscriptions.has(key);
  }

  /**
   * Get all subscription keys
   */
  public get keys(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}
