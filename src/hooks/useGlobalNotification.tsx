
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_UNREAD_MENTIONS_UPDATED } from '@/lib/events';
import { EVENT_NEW_MESSAGE_RECEIVED } from '@/hooks/chat/useSubscriptions';
import { useNavigate } from 'react-router-dom';

export const useGlobalNotification = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[GlobalNotification] Setting up global notification listeners');
    
    // Listen for new message events
    const handleNewMessage = async (data: any) => {
      console.log('[GlobalNotification] New message received:', data);
      
      try {
        // Get sender details to display in toast
        const { data: senderData } = await supabase
          .rpc('get_message_sender_details', {
            sender_id: data.message.sender_id
          });
          
        const sender = senderData?.[0];
        if (!sender) return;
        
        // Get channel name for context
        const { data: channelData } = await supabase
          .from('chat_channels')
          .select('name')
          .eq('id', data.channelId)
          .single();
          
        // Show toast notification with message preview
        toast({
          title: `Nouveau message de ${sender.name}`,
          description: `${channelData?.name || 'Canal'}: ${data.message.content.substring(0, 50)}${data.message.content.length > 50 ? '...' : ''}`,
          action: (
            <button 
              className="px-3 py-1 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90"
              onClick={() => navigate('/interpreter/messages')}
            >
              Voir
            </button>
          ),
        });
      } catch (error) {
        console.error('[GlobalNotification] Error processing message notification:', error);
      }
    };

    // Subscribe to new message events
    eventEmitter.on(EVENT_NEW_MESSAGE_RECEIVED, handleNewMessage);
    
    // Cleanup function
    return () => {
      eventEmitter.off(EVENT_NEW_MESSAGE_RECEIVED, handleNewMessage);
    };
  }, [toast, navigate]);
  
  return null; // This hook doesn't return anything
};
