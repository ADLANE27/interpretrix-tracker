
import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// This hook is now simplified to use our new realtime subscription pattern
export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  onUpdate: () => void
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // Set up specialized subscriptions (like mentions)
  useEffect(() => {
    if (!channelId || !currentUserId) return;
    
    console.log('[Chat] Setting up mentions subscription for channel:', channelId);
    
    // Clean up existing channel if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Set up subscription for mentions
    channelRef.current = supabase
      .channel(`mentions-${channelId}-${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_mentions',
        filter: `mentioned_user_id=eq.${currentUserId}`
      }, (payload) => {
        console.log('[Chat] New mention received:', payload);
        onUpdate();
      })
      .subscribe();
      
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelId, currentUserId, onUpdate]);

  // No need to expose isSubscribed anymore as it's not used
};
