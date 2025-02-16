
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BackgroundSyncOptions {
  onSyncComplete?: (data: any) => void;
  onSyncError?: (error: Error) => void;
}

export const useBackgroundSync = (options: BackgroundSyncOptions = {}) => {
  const { onSyncComplete, onSyncError } = options;

  const requestSync = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        await navigator.serviceWorker.ready;
        await navigator.serviceWorker.controller.postMessage({
          type: 'REQUEST_SYNC'
        });
      }
    } catch (error) {
      console.error('Failed to request sync:', error);
      onSyncError?.(error as Error);
    }
  }, [onSyncError]);

  useEffect(() => {
    const handleSyncMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        onSyncComplete?.(event.data.data);
      }
    };

    // Listen for sync completion messages from service worker
    navigator.serviceWorker?.addEventListener('message', handleSyncMessage);

    // Set up real-time subscription for interpreter status changes
    const channel = supabase.channel('interpreter_status_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interpreter_connection_status',
        },
        (payload) => {
          // Request a sync when we detect changes
          requestSync();
        }
      )
      .subscribe();

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSyncMessage);
      supabase.removeChannel(channel);
    };
  }, [onSyncComplete, requestSync]);

  return { requestSync };
};
