
import { supabase } from '@/integrations/supabase/client';
import { isCircuitBreakerOpen, recordFailure, recordSuccess } from './circuit-breaker';

/**
 * Enables realtime functionality for a specific table
 * Returns true if successful, false otherwise
 */
export const enableRealtimeForTable = async (
  tableName: string, 
  debugMode = false
): Promise<boolean> => {
  const log = (message: string, ...args: any[]) => {
    if (debugMode) {
      console.log(`[RealtimeEnabler] ${message}`, ...args);
    }
  };
  
  const logError = (message: string, ...args: any[]) => {
    console.error(`[RealtimeEnabler] ${message}`, ...args);
  };
  
  // Skip if the circuit breaker is open
  if (isCircuitBreakerOpen()) {
    log(`Circuit breaker is open, skipping enablement request`);
    return false;
  }
  
  try {
    log(`Enabling realtime for table ${tableName}`);
    
    // Create a channel and subscribe to it
    const channel = supabase.channel('realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: tableName 
      }, () => {})
      .subscribe();
      
    if (!channel) {
      logError(`Error enabling realtime for table ${tableName}: Channel creation failed`);
      recordFailure();
      return false;
    }
    
    log(`Successfully enabled realtime for table ${tableName}`);
    recordSuccess();
    return true;
  } catch (error) {
    logError(`Error enabling realtime for table ${tableName}:`, error);
    recordFailure();
    return false;
  }
};
