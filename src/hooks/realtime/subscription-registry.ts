
/**
 * Registry to track active subscriptions and prevent duplicates
 */

// Global table registry to avoid duplicate subscriptions
const activeSubscriptions = new Map<string, { count: number, tables: Set<string> }>();

/**
 * Register a subscription for a user ID and table
 */
export const registerSubscription = (userId: string, tableName: string): void => {
  if (!activeSubscriptions.has(userId)) {
    activeSubscriptions.set(userId, { count: 1, tables: new Set([tableName]) });
  } else {
    const userSubs = activeSubscriptions.get(userId)!;
    userSubs.count++;
    userSubs.tables.add(tableName);
  }
};

/**
 * Unregister a subscription for a user ID and table
 * Returns true if all subscriptions for this user have been removed
 */
export const unregisterSubscription = (userId: string, tableName: string): boolean => {
  if (activeSubscriptions.has(userId)) {
    const userSubs = activeSubscriptions.get(userId)!;
    userSubs.count--;
    
    if (userSubs.count <= 0) {
      activeSubscriptions.delete(userId);
      return true;
    }
  }
  
  return false;
};

/**
 * Get the current count of subscriptions for a user
 */
export const getSubscriptionCount = (userId: string): number => {
  return activeSubscriptions.has(userId) ? activeSubscriptions.get(userId)!.count : 0;
};
