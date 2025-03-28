import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_NEW_MESSAGE_RECEIVED } from '@/lib/events';
import { useNavigate } from 'react-router-dom';
import { playNotificationSound } from '@/utils/notificationSound';
import { AtSign, MessageSquare, Reply, Bell } from 'lucide-react';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { Button } from '@/components/ui/button';

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
  },
  enableNotifications: {
    fr: "Activer les notifications",
    en: "Enable notifications"
  }
};

export const useGlobalNotification = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { permission, requestPermission, showNotification } = useBrowserNotification();
  const [hasShownPermissionPrompt, setHasShownPermissionPrompt] = useState(false);
  
  // Show a toast notification to request permission only once per session
  useEffect(() => {
    if (
      'Notification' in window && 
      Notification.permission === 'default' && 
      !hasShownPermissionPrompt
    ) {
      setHasShownPermissionPrompt(true);
      
      toast({
        title: "Notifications",
        description: "Recevez des notifications pour les nouveaux messages.",
        action: (
          <Button 
            onClick={() => {
              // Only request permission in response to user interaction
              requestPermission();
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <Bell className="h-3.5 w-3.5" />
            {NOTIFICATION_TRANSLATIONS.enableNotifications.fr}
          </Button>
        ),
        duration: 10000,
      });
    }
  }, [toast, requestPermission, hasShownPermissionPrompt]);
  
  useEffect(() => {
    console.log('[GlobalNotification] Setting up global notification listeners');
    
    const handleNewMessage = async (data: any) => {
      console.log('[GlobalNotification] New message received:', data);
      console.log('[GlobalNotification] Message mentions:', data.message.mentions);
      console.log('[GlobalNotification] Is mention flag:', data.isMention);
      console.log('[GlobalNotification] Is thread reply:', data.isThreadReply);
      console.log('[GlobalNotification] Is reply to user message:', data.isReplyToUserMessage);
      
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        
        // Vérifier si ce message est envoyé par l'utilisateur actuel
        if (data.message.sender_id === userData.user.id) {
          console.log('[GlobalNotification] Skip notification for own message');
          return;
        }
        
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
        
        let title, description, icon, channelName = channelData?.name || 'un canal';
        
        if (hasMention) {
          title = NOTIFICATION_TRANSLATIONS.mentionNotice.fr;
          description = `${sender.name} vous a mentionné dans ${channelName}`;
          icon = AtSign;
          console.log('[GlobalNotification] Using mention notification in French:', {
            title,
            description
          });
        } else if (isReplyToUserMessage) {
          title = NOTIFICATION_TRANSLATIONS.threadReplyNotice.fr;
          description = `${sender.name} a répondu à votre message dans ${channelName}`;
          icon = Reply;
          console.log('[GlobalNotification] Using thread reply notification in French:', {
            title,
            description
          });
        } else {
          title = `${NOTIFICATION_TRANSLATIONS.newMessage.fr} ${sender.name}`;
          description = `${channelName}: ${data.message.content.substring(0, 50)}${data.message.content.length > 50 ? '...' : ''}`;
          icon = MessageSquare;
          console.log('[GlobalNotification] Using regular message notification in French');
        }
        
        if (hasMention || isReplyToUserMessage) {
          await playNotificationSound();
          
          console.log('[GlobalNotification] Displaying toast notification in French:', { title, description });
          
          // Déterminer le chemin de redirection en fonction du rôle de l'utilisateur
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userData.user.id)
            .single();
            
          const userRole = roleData?.role;
          const redirectPath = userRole === 'admin' ? '/admin/messages' : '/interpreter/messages';
          
          // Afficher une notification toast dans l'application
          toast({
            title: title,
            description: description,
            variant: "default",
            action: (
              <button 
                className="px-3 py-1 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90 flex items-center gap-1.5"
                onClick={() => navigate(redirectPath)}
              >
                {icon && React.createElement(icon, { className: "w-3 h-3" })}
                {NOTIFICATION_TRANSLATIONS.viewButton.fr}
              </button>
            ),
            duration: 7000,
          });
          
          // Envoyer également une notification du navigateur si l'utilisateur a accordé la permission
          if (permission === 'granted') {
            showNotification(title, {
              body: description,
              tag: `message-${data.message.id}`,
              icon: '/icon.svg',
              data: {
                url: redirectPath
              },
              requireInteraction: true
            });
          }
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
  }, [toast, navigate, permission, requestPermission, showNotification]);
  
  return null;
};
