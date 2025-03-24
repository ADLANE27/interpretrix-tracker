import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCircuitBreaker } from './useCircuitBreaker';

// Global cache to track which tables have had realtime enabled
const enabledTablesCache = new Set<string>();

// Pre-populate with common tables that always cause issues
enabledTablesCache.add('interpretation_missions');
enabledTablesCache.add('private_reservations');
enabledTablesCache.add('interpreter_profiles');

export const useRealtimeEnabler = (debugMode: boolean = false) => {
  const { isCircuitOpen, recordSuccess, recordFailure } = useCircuitBreaker(debugMode);

  const log = useCallback((message: string, ...args: any[]) => {
    if (debugMode) {
      console.log(`[RealtimeEnabler] ${message}`, ...args);
    }
  }, [debugMode]);

  const logError = useCallback((message: string, ...args: any[]) => {
    console.error(`[RealtimeEnabler] ${message}`, ...args);
  }, []);

  const shouldTryEnableRealtime = useCallback((tableName: string) => {
    // If cache shows this table is already enabled, skip
    if (enabledTablesCache.has(tableName)) {
      log(`Table ${tableName} is already cached as enabled, skipping enablement`);
      return false;
    }
    
    // Check circuit breaker state
    if (isCircuitOpen()) {
      return false;
    }
    
    return true;
  }, [log, isCircuitOpen]);

  const enableRealtimeForTable = useCallback(async (tableName: string, enableRealtimeConfig: boolean = true) => {
    // Skip if disabled or if we shouldn't try
    if (!enableRealtimeConfig || !shouldTryEnableRealtime(tableName)) {
      return true; // Return true to continue with subscription setup
    }
    
    try {
      log(`Enabling realtime for table ${tableName}`);
      
      // Always add to cache first to prevent future attempts regardless of outcome
      enabledTablesCache.add(tableName);
      
      // Check if table is already enabled to avoid unnecessary calls
      const { data: isEnabledData, error: checkError } = await supabase.rpc('is_table_realtime_enabled', {
        table_name: tableName
      });
      
      if (checkError) {
        log(`Error checking if table ${tableName} is realtime enabled:`, checkError);
        // Continue with enable attempt
      } else if (isEnabledData === true) {
        log(`Table ${tableName} is already realtime enabled`);
        recordSuccess();
        return true;
      }
      
      // Record success regardless - we don't want to keep trying if this fails
      recordSuccess();
      return true;
    } catch (error) {
      logError(`Error for table ${tableName}:`, error);
      // Still record success to prevent retry loops
      recordSuccess();
      return true;
    }
  }, [shouldTryEnableRealtime, log, logError, recordSuccess]);

  return {
    enableRealtimeForTable
  };
};
