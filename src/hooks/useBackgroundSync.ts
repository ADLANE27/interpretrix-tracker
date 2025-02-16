
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
      console.log('[useBackgroundSync] Requesting sync...');
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        await navigator.serviceWorker.ready;
        await navigator.serviceWorker.controller.postMessage({
          type: 'REQUEST_SYNC'
        });
      }
    } catch (error) {
      console.error('[useBackgroundSync] Failed to request sync:', error);
      onSyncError?.(error as Error);
    }
  }, [onSyncError]);

  useEffect(() => {
    const handleSyncMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        console.log('[useBackgroundSync] Sync completed:', event.data);
        onSyncComplete?.(event.data.data);
      }
    };

    // Listen for sync completion messages from service worker
    navigator.serviceWorker?.addEventListener('message', handleSyncMessage);

    // Set up real-time subscription for all relevant tables
    const channel = supabase.channel('sync_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_status',
          filter: `status=eq.pending`
        },
        (payload) => {
          console.log('[useBackgroundSync] Sync status change detected:', payload);
          requestSync();
        }
      )
      .subscribe((status) => {
        console.log('[useBackgroundSync] Channel subscription status:', status);
      });

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSyncMessage);
      supabase.removeChannel(channel);
    };
  }, [onSyncComplete, requestSync]);

  return { requestSync };
};
