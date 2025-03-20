
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_NEW_MESSAGE_RECEIVED } from '@/lib/events';
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
        console.log('[GlobalNotification] Sender details:', sender);
        if (!sender) {
          console.log('[GlobalNotification] No sender details found, skipping toast');
          return;
        }
        
        // Get channel name for context
        const { data: channelData } = await supabase
          .from('chat_channels')
          .select('name')
          .eq('id', data.channelId)
          .single();
          
        console.log('[GlobalNotification] Channel details:', channelData);
        
        // Show toast notification with message preview
        console.log('[GlobalNotification] Displaying toast notification');
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
          duration: 5000, // Longer duration for better visibility
        });
      } catch (error) {
        console.error('[GlobalNotification] Error processing message notification:', error);
      }
    };

    // Subscribe to new message events
    eventEmitter.on(EVENT_NEW_MESSAGE_RECEIVED, handleNewMessage);
    console.log('[GlobalNotification] Successfully subscribed to new message events');
    
    // Cleanup function
    return () => {
      console.log('[GlobalNotification] Cleaning up global notification listeners');
      eventEmitter.off(EVENT_NEW_MESSAGE_RECEIVED, handleNewMessage);
    };
  }, [toast, navigate]);
  
  return null; // This hook doesn't return anything
};
