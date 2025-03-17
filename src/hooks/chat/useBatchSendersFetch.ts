
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSenderCache } from './useSenderCache';

export const useBatchSendersFetch = () => {
  const { 
    batchGetCachedSenders, 
    batchSetCachedSenders 
  } = useSenderCache();

  const fetchSendersInBatch = useCallback(async (senderIds: string[]) => {
    if (!senderIds.length) return {};

    const uniqueIds = [...new Set(senderIds)];
    const { cached, uncachedIds } = batchGetCachedSenders(uniqueIds);
    
    if (!uncachedIds.length) {
      console.log('[Chat] All sender details found in cache');
      return cached;
    }
    
    console.log(`[Chat] Fetching ${uncachedIds.length} sender details in batch`);
    
    try {
      // Using a custom function to batch fetch sender details
      const { data, error } = await supabase.rpc(
        'batch_get_message_sender_details',
        { p_sender_ids: uncachedIds }
      ) as any;
      
      if (error) throw error;
      
      if (data && Array.isArray(data)) {
        const fetchedSenders = data.map(sender => ({
          id: sender.id,
          name: sender.name,
          avatarUrl: sender.avatar_url || ''
        }));
        
        batchSetCachedSenders(fetchedSenders);
        
        // Combine cached and newly fetched data
        const allSenders = { ...cached };
        fetchedSenders.forEach(sender => {
          allSenders[sender.id] = sender;
        });
        
        return allSenders;
      }
    } catch (error) {
      console.error('[Chat] Error batch fetching sender details:', error);
    }
    
    return cached;
  }, [batchGetCachedSenders, batchSetCachedSenders]);

  return { fetchSendersInBatch };
};
