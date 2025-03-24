
import { useEffect, useRef } from 'react';

/**
 * Hook to listen for interpreter status update events
 */
export const useStatusEventListener = (onUpdate: () => void) => {
  const lastStatusRef = useRef<string | null>(null);
  const lastTimestampRef = useRef<number>(0);
  
  useEffect(() => {
    console.log('[useStatusEventListener] Setting up interpreter status event listener');
    
    // Listen for status update events with improved de-duplication
    const handleStatusUpdate = (event: CustomEvent<{
      interpreter_id: string, 
      status: string, 
      timestamp?: number
    }>) => {
      // First, validate we have all the data we need
      if (!event.detail || !event.detail.interpreter_id || !event.detail.status) {
        console.log('[useStatusEventListener] Ignoring invalid event:', event);
        return;
      }
      
      // Get the timestamp, or use current time if not provided
      const timestamp = event.detail.timestamp || Date.now();
      
      // Skip if this is the same status and we processed an update recently
      const isRecentDuplicate = event.detail.status === lastStatusRef.current && 
                               timestamp - lastTimestampRef.current < 2000;
                               
      if (isRecentDuplicate) {
        console.log('[useStatusEventListener] Skipping recent duplicate status update');
        return;
      }
      
      console.log('[useStatusEventListener] Status update event received, triggering refresh:', event.detail);
      
      // Update our tracking references
      lastStatusRef.current = event.detail.status;
      lastTimestampRef.current = timestamp;
      
      // Trigger the callback to refresh data
      onUpdate();
    };

    window.addEventListener('interpreter-status-update', handleStatusUpdate as EventListener);

    return () => {
      console.log('[useStatusEventListener] Cleaning up event listener');
      window.removeEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
    };
  }, [onUpdate]);

  return {
    lastStatus: lastStatusRef.current,
    lastTimestamp: lastTimestampRef.current
  };
};
