
import { useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { MessageData, Message } from '@/types/messaging';
import { ChatChannelType } from './types/chatHooks';
import { normalizeTimestampForSorting } from '@/utils/dateTimeUtils';

export const useMessageProcessor = (userRole: React.MutableRefObject<string>) => {
  // Traiter un seul message avec une meilleure gestion des erreurs
  const processMessage = useCallback(async (
    messageData: MessageData, 
    channelType: ChatChannelType,
    messagesMap: Map<string, Message>,
    pendingMessageUpdates: Set<string>,
    updateMessagesArray: () => void
  ) => {
    try {
      // Suivre cet ID de message comme en attente d'une mise à jour
      pendingMessageUpdates.add(messageData.id);
      
      // Vérifier si le message existe déjà dans la carte
      if (messagesMap.has(messageData.id)) {
        // Mettre à jour le message existant si nécessaire
        const existingMessage = messagesMap.get(messageData.id)!;
        
        // Traiter les réactions
        let messageReactions: Record<string, string[]> = {};
        
        if (messageData.reactions) {
          // Gérer les réactions sous forme de chaîne ou d'objet
          if (typeof messageData.reactions === 'string') {
            try {
              messageReactions = JSON.parse(messageData.reactions);
            } catch (e) {
              console.error(`[useMessageProcessor ${userRole.current}] Failed to parse reactions string:`, e);
              messageReactions = {};
            }
          } else if (typeof messageData.reactions === 'object') {
            messageReactions = messageData.reactions as Record<string, string[]>;
          }
        }
        
        // Traiter les pièces jointes - s'assurer qu'elles sont correctement formatées
        const attachments = messageData.attachments 
          ? messageData.attachments.map(attachment => {
              if (typeof attachment === 'object' && attachment !== null) {
                return attachment;
              }
              return {
                url: '',
                filename: '',
                type: '',
                size: 0
              };
            }) 
          : existingMessage.attachments;
        
        // Ne mettre à jour que si quelque chose a changé (réactions, etc.)
        const updatedMessage = {
          ...existingMessage,
          content: messageData.content || existingMessage.content,
          reactions: messageReactions,
          attachments,
          // S'assurer que nous gardons l'horodatage d'origine pour la cohérence
          timestamp: existingMessage.timestamp
        };
        
        messagesMap.set(messageData.id, updatedMessage);
        console.log(`[useMessageProcessor ${userRole.current}] Updated existing message:`, messageData.id);
        pendingMessageUpdates.delete(messageData.id);
        return;
      }

      // Obtenir les détails de l'expéditeur
      const { data: senderDetails, error: senderError } = await supabase
        .rpc('get_message_sender_details', {
          sender_id: messageData.sender_id,
        });

      if (senderError) {
        console.error(`[useMessageProcessor ${userRole.current}] Error getting sender details:`, senderError);
        pendingMessageUpdates.delete(messageData.id);
        return;
      }

      if (!senderDetails || senderDetails.length === 0) {
        console.error(`[useMessageProcessor ${userRole.current}] No sender details found for:`, messageData.sender_id);
        pendingMessageUpdates.delete(messageData.id);
        return;
      }

      // Traiter les réactions
      let messageReactions: Record<string, string[]> = {};
      
      if (messageData.reactions) {
        // Gérer les réactions sous forme de chaîne ou d'objet
        if (typeof messageData.reactions === 'string') {
          try {
            messageReactions = JSON.parse(messageData.reactions);
          } catch (e) {
            console.error(`[useMessageProcessor ${userRole.current}] Failed to parse reactions string:`, e);
            messageReactions = {};
          }
        } else if (typeof messageData.reactions === 'object') {
          messageReactions = messageData.reactions as Record<string, string[]>;
        }
      }

      // Traiter les pièces jointes avec une meilleure gestion des erreurs
      const attachments = messageData.attachments 
        ? messageData.attachments.map(attachment => {
            if (typeof attachment === 'object' && attachment !== null) {
              return attachment;
            }
            return {
              url: '',
              filename: '',
              type: '',
              size: 0
            };
          }) 
        : [];

      // Créer un objet Date stable qui ne changera pas lors des rerenders
      // Utiliser new Date().setTime() pour éviter les problèmes de fuseaux horaires
      const messageDate = new Date();
      messageDate.setTime(new Date(messageData.created_at).getTime());
      
      // Créer un objet message avec un horodatage normalisé
      const message: Message = {
        id: messageData.id,
        content: messageData.content,
        sender: {
          id: senderDetails[0].id,
          name: senderDetails[0].name,
          avatarUrl: senderDetails[0].avatar_url,
        },
        // Stocker l'horodatage en tant qu'objet Date pour une meilleure stabilité
        timestamp: messageDate,
        parent_message_id: messageData.parent_message_id,
        attachments,
        channelType: channelType,
        reactions: messageReactions
      };

      // Ajouter à la carte
      messagesMap.set(message.id, message);
      console.log(`[useMessageProcessor ${userRole.current}] Processed new message:`, message.id, 'at', messageDate.toISOString());
      pendingMessageUpdates.delete(messageData.id);

    } catch (error) {
      console.error(`[useMessageProcessor ${userRole.current}] Error processing message:`, error, messageData);
      pendingMessageUpdates.delete(messageData.id);
    }
  }, []);

  return { processMessage };
};
