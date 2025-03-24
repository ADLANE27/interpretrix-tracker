
import { useEffect, useRef } from 'react';

/**
 * Hook to listen for interpreter status update events
 */
export const useStatusEventListener = (onUpdate: () => void) => {
  const updateIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    console.log('[useStatusEventListener] Setting up interpreter status event listener');
    
    // Listen for status update events with improved de-duplication
    const handleStatusUpdate = (event: CustomEvent<{interpreter_id: string, status: string, timestamp?: number}>) => {
      console.log('[useStatusEventListener] Status update event received, triggering refresh');
      
      // Create a unique update identifier to prevent duplicate processing
      const updateId = `${event.detail.status}-${event.detail.timestamp || Date.now()}-${event.detail.interpreter_id}`;
      
      // Skip if this is a duplicate of our last update
      if (updateId === updateIdRef.current) {
        console.log('[useStatusEventListener] Skipping duplicate event:', updateId);
        return;
      }
      
      updateIdRef.current = updateId;
      onUpdate();
    };

    window.addEventListener('interpreter-status-update', handleStatusUpdate as EventListener);

    return () => {
      console.log('[useStatusEventListener] Cleaning up event listener');
      window.removeEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
    };
  }, [onUpdate]);

  return {
    lastUpdateId: updateIdRef.current
  };
};
