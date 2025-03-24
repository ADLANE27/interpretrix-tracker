
import { useCallback } from 'react';

export const useRealtimeLogger = (
  instanceId: string,
  debugMode: boolean = false
) => {
  const log = useCallback((message: string, ...args: any[]) => {
    if (debugMode) {
      console.log(`[Realtime ${instanceId}] ${message}`, ...args);
    }
  }, [instanceId, debugMode]);

  const logError = useCallback((message: string, ...args: any[]) => {
    console.error(`[Realtime ${instanceId}] ${message}`, ...args);
  }, [instanceId]);

  return {
    log,
    logError
  };
};
