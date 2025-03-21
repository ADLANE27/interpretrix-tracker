import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_NEW_MESSAGE_RECEIVED } from '@/lib/events';
import { useNavigate } from 'react-router-dom';
import { playNotificationSound } from '@/utils/notificationSound';
import { AtSign, MessageSquare, Reply } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const NOTIFICATION_TRANSLATIONS = {
  newMessage: {
    fr: "Nouveau message de",
    en: "New message from"
  },
  viewButton: {
    fr: "Voir",
    en: "View"
  },
  mentionNotice: {
    fr: "Nouvelle mention",
    en: "New Mention"
  },
  mentionText: {
    fr: "Vous avez été mentionné dans un message",
    en: "You were mentioned in a message"
  },
  threadReplyNotice: {
    fr: "Nouvelle réponse",
    en: "New reply"
  },
  threadReplyText: {
    fr: "Quelqu'un a répondu à votre message",
    en: "Someone replied to your message"
  }
};

export const useGlobalNotification = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[GlobalNotification] Setting up global notification listeners');
    
    const handleNewMessage = async (data: any) => {
      console.log('[GlobalNotification] New message received:', data);
      console.log('[GlobalNotification] Message mentions:', data.message.mentions);
      console.log('[GlobalNotification] Is mention flag:', data.isMention);
      console.log('[GlobalNotification] Is thread reply:', data.isThreadReply);
      console.log('[GlobalNotification] Is reply to user message:', data.isReplyToUserMessage);
      
      try {
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
        
        const { data: channelData } = await supabase
          .from('chat_channels')
          .select('name')
          .eq('id', data.channelId)
          .single();
          
        console.log('[GlobalNotification] Channel details:', channelData);
        
        const hasMention = Boolean(data.isMention) || 
          (data.message.mentions && 
          Array.isArray(data.message.mentions) && 
          data.message.mentions.length > 0);
        
        console.log('[GlobalNotification] Has mention detected:', hasMention);
        
        const isReplyToUserMessage = Boolean(data.isReplyToUserMessage);
        console.log('[GlobalNotification] Is reply to user message:', isReplyToUserMessage);
        
        let title, description, icon;
        
        if (hasMention) {
          title = NOTIFICATION_TRANSLATIONS.mentionNotice.fr;
          description = `${sender.name} vous a mentionné dans ${channelData?.name || 'un canal'}`;
          icon = AtSign;
          console.log('[GlobalNotification] Using mention notification in French:', {
            title,
            description
          });
        } else if (isReplyToUserMessage) {
          title = NOTIFICATION_TRANSLATIONS.threadReplyNotice.fr;
          description = `${sender.name} a répondu à votre message dans ${channelData?.name || 'un canal'}`;
          icon = Reply;
          console.log('[GlobalNotification] Using thread reply notification in French:', {
            title,
            description
          });
        } else {
          title = `${NOTIFICATION_TRANSLATIONS.newMessage.fr} ${sender.name}`;
          description = `${channelData?.name || 'Canal'}: ${data.message.content.substring(0, 50)}${data.message.content.length > 50 ? '...' : ''}`;
          icon = MessageSquare;
          console.log('[GlobalNotification] Using regular message notification in French');
        }
        
        if (hasMention || isReplyToUserMessage) {
          await playNotificationSound();
          
          console.log('[GlobalNotification] Displaying toast notification in French:', { title, description });
          
          toast({
            title: title,
            description: description,
            variant: "default",
            action: (
              <button 
                className="px-3 py-1 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90 flex items-center gap-1.5"
                onClick={() => navigate('/interpreter/messages')}
              >
                {icon && React.createElement(icon, { className: "w-3 h-3" })}
                {NOTIFICATION_TRANSLATIONS.viewButton.fr}
              </button>
            ),
            duration: 7000,
          });
        }
      } catch (error) {
        console.error('[GlobalNotification] Error processing message notification:', error);
      }
    };

    eventEmitter.on(EVENT_NEW_MESSAGE_RECEIVED, handleNewMessage);
    console.log('[GlobalNotification] Successfully subscribed to new message events');
    
    return () => {
      console.log('[GlobalNotification] Cleaning up global notification listeners');
      eventEmitter.off(EVENT_NEW_MESSAGE_RECEIVED, handleNewMessage);
    };
  }, [toast, navigate]);
  
  return null;
};
