
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment, MessageData, isAttachment, parseReactions } from '@/types/messaging';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { playNotificationSound } from '@/utils/notificationSound';

export interface UseChatCoreProps {
  channelId: string;
  currentUserId: string | null;
  filters?: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
}

export const useChatCore = ({
  channelId,
  currentUserId,
  filters = {}
}: UseChatCoreProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Fetch messages using a direct query
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['channel-messages', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      try {
        // Using a direct SQL query for efficient fetching
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            id, 
            content, 
            created_at,
            sender_id,
            channel_id,
            parent_message_id,
            reactions,
            attachments
          `)
          .eq('channel_id', channelId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!Array.isArray(data)) return [];
        
        // Get unique sender IDs for batch fetching
        const senderIds = [...new Set(data.map(msg => msg.sender_id))];
        
        // Batch fetch all sender details
        const { data: senders, error: sendersError } = await supabase
          .from('interpreter_profiles')
          .select('id, first_name, last_name, profile_picture_url')
          .in('id', senderIds);
          
        if (sendersError) {
          console.error('[Chat] Error fetching sender details:', sendersError);
        }

        // Create sender lookup map
        const senderMap: {[key: string]: {id: string, name: string, avatarUrl: string}} = {};
        if (senders) {
          senders.forEach(sender => {
            senderMap[sender.id] = {
              id: sender.id,
              name: `${sender.first_name} ${sender.last_name}`,
              avatarUrl: sender.profile_picture_url || ''
            };
          });
        }

        // For admin users not found in interpreter profiles, fetch from auth.users via function
        const missingIds = senderIds.filter(id => !senderMap[id]);
        if (missingIds.length > 0) {
          const { data: adminSenders, error: adminError } = await supabase
            .rpc('batch_get_message_sender_details', { p_sender_ids: missingIds });
            
          if (adminError) {
            console.error('[Chat] Error fetching admin details:', adminError);
          } else if (adminSenders) {
            adminSenders.forEach((sender: any) => {
              senderMap[sender.id] = {
                id: sender.id,
                name: sender.name,
                avatarUrl: sender.avatar_url || ''
              };
            });
          }
        }
        
        // Transform the data into Message objects
        const formattedMessages: Message[] = data.map(msg => {
          const sender = senderMap[msg.sender_id] || {
            id: msg.sender_id,
            name: 'Unknown User',
            avatarUrl: ''
          };

          // Parse reactions with type safety
          const parsedReactions = parseReactions(msg.reactions);

          // Handle attachments with type safety
          const parsedAttachments: Attachment[] = [];
          if (Array.isArray(msg.attachments)) {
            msg.attachments.forEach(att => {
              if (typeof att === 'object' && att !== null) {
                const attachment = {
                  url: String(att['url'] || ''),
                  filename: String(att['filename'] || ''),
                  type: String(att['type'] || ''),
                  size: Number(att['size'] || 0)
                };
                if (isAttachment(attachment)) {
                  parsedAttachments.push(attachment);
                }
              }
            });
          }

          return {
            id: msg.id,
            content: msg.content,
            sender: sender,
            sender_id: msg.sender_id,
            channel_id: msg.channel_id,
            timestamp: new Date(msg.created_at),
            created_at: msg.created_at,
            reactions: parsedReactions,
            attachments: parsedAttachments,
            channelType: 'group',
            parent_message_id: msg.parent_message_id
          };
        });
        
        return formattedMessages;
      } catch (error) {
        console.error('[Chat] Error fetching messages:', error);
        toast({
          title: "Error",
          description: "Failed to load messages. Please try again.",
          variant: "destructive",
        });
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes to reduce refetching
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Filter messages based on filters
  const filteredMessages = useCallback(() => {
    let filtered = messages;

    if (filters.userId) {
      filtered = filtered.filter(msg => {
        if (filters.userId === 'current') {
          return msg.sender.id === currentUserId;
        }
        return msg.sender.id === filters.userId;
      });
    }

    if (filters.keyword) {
      const keywordLower = filters.keyword.toLowerCase();
      filtered = filtered.filter(msg =>
        msg.content.toLowerCase().includes(keywordLower)
      );
    }

    if (filters.date) {
      filtered = filtered.filter(msg => {
        const messageDate = new Date(msg.timestamp).toDateString();
        const filterDate = filters.date!.toDateString();
        return messageDate === filterDate;
      });
    }

    return filtered;
  }, [messages, filters, currentUserId]);

  // Set up real-time subscription - optimized to only handle new messages
  useEffect(() => {
    if (!channelId) return;
    
    const channel = supabase
      .channel(`public:chat_messages:channel_id=eq.${channelId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        console.log('[Chat] New message received:', payload);
        
        // Instead of invalidating the query, we can directly update the cache
        // This avoids refetching all messages
        queryClient.setQueryData<Message[]>(['channel-messages', channelId], (oldData = []) => {
          const newMessage = payload.new;
          
          // Check if message already exists in cache
          const messageExists = oldData.some(msg => msg.id === newMessage.id);
          if (messageExists) {
            return oldData;
          }
          
          // We need to fetch the sender details for the new message
          supabase
            .rpc('batch_get_message_sender_details', { p_sender_ids: [newMessage.sender_id] })
            .then(({ data: senderData, error }) => {
              if (error || !senderData || senderData.length === 0) {
                console.error('[Chat] Error fetching sender details:', error);
                return;
              }
              
              const sender = senderData[0];

              // Parse reactions with type safety
              const parsedReactions = parseReactions(newMessage.reactions);
              
              // Handle attachments with type safety
              const parsedAttachments: Attachment[] = [];
              if (Array.isArray(newMessage.attachments)) {
                newMessage.attachments.forEach((att: any) => {
                  if (typeof att === 'object' && att !== null) {
                    const attachment = {
                      url: String(att['url'] || ''),
                      filename: String(att['filename'] || ''),
                      type: String(att['type'] || ''),
                      size: Number(att['size'] || 0)
                    };
                    if (isAttachment(attachment)) {
                      parsedAttachments.push(attachment);
                    }
                  }
                });
              }
              
              const formattedMessage: Message = {
                id: newMessage.id,
                content: newMessage.content,
                sender: {
                  id: newMessage.sender_id,
                  name: sender.name || 'Unknown User',
                  avatarUrl: sender.avatar_url || '',
                },
                sender_id: newMessage.sender_id,
                channel_id: newMessage.channel_id,
                timestamp: new Date(newMessage.created_at),
                created_at: newMessage.created_at,
                reactions: parsedReactions,
                attachments: parsedAttachments,
                channelType: 'group',
                parent_message_id: newMessage.parent_message_id
              };
              
              // Update the query cache with the new message
              queryClient.setQueryData<Message[]>(['channel-messages', channelId], (oldData = []) => {
                return [...oldData, formattedMessage];
              });
              
              // Play sound if the message is not from current user
              if (formattedMessage.sender.id !== currentUserId) {
                playNotificationSound();
              }
            });
          
          return oldData;
        });
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        console.log('[Chat] Message deleted:', payload);
        
        // Update the cache by filtering out the deleted message
        queryClient.setQueryData<Message[]>(['channel-messages', channelId], (oldData = []) => {
          return oldData.filter(msg => msg.id !== payload.old.id);
        });
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        console.log('[Chat] Message updated:', payload);
        
        // Update the specific message in cache
        queryClient.setQueryData<Message[]>(['channel-messages', channelId], (oldData = []) => {
          return oldData.map(msg => {
            if (msg.id === payload.new.id) {
              // Parse reactions with type safety
              const parsedReactions = parseReactions(payload.new.reactions);
              
              // Handle attachments with type safety
              const parsedAttachments: Attachment[] = [];
              if (Array.isArray(payload.new.attachments)) {
                payload.new.attachments.forEach((att: any) => {
                  if (typeof att === 'object' && att !== null) {
                    const attachment = {
                      url: String(att['url'] || ''),
                      filename: String(att['filename'] || ''),
                      type: String(att['type'] || ''),
                      size: Number(att['size'] || 0)
                    };
                    if (isAttachment(attachment)) {
                      parsedAttachments.push(attachment);
                    }
                  }
                });
              }
              
              return {
                ...msg,
                content: payload.new.content,
                reactions: parsedReactions,
                attachments: parsedAttachments
              };
            }
            return msg;
          });
        });
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, currentUserId, queryClient]);

  // File upload handler
  const uploadAttachment = async (file: File): Promise<Attachment> => {
    try {
      setIsUploading(true);
      
      // Validate file
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        throw new Error('File is too large (max 100MB)');
      }
      
      // Sanitize filename to prevent issues
      const sanitizedFilename = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '_');
      const timestamp = Date.now();
      const finalFilename = `${timestamp}_${sanitizedFilename}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(finalFilename, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(finalFilename);

      return {
        url: publicUrl,
        filename: file.name, // Keep original filename for display
        type: file.type,
        size: file.size
      };
    } catch (error) {
      console.error('[Chat] Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Send message function
  const sendMessage = async (
    content: string,
    parentMessageId?: string | null,
    files: File[] = []
  ): Promise<string> => {
    if (!channelId || !currentUserId) throw new Error("Missing required data");
    if (!content.trim() && files.length === 0) throw new Error("Message cannot be empty");
    
    try {
      setIsUploading(true);
      
      // Upload attachments if any
      let uploadedAttachments = [];
      if (files.length > 0) {
        uploadedAttachments = await Promise.all(
          files.map(file => uploadAttachment(file))
        );
      }

      const newMessage = {
        channel_id: channelId,
        sender_id: currentUserId,
        content: content.trim(),
        parent_message_id: parentMessageId,
        attachments: uploadedAttachments,
        reactions: {}
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(newMessage)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned from insert");
      
      return data.id;
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Delete message function
  const deleteMessage = async (messageId: string): Promise<void> => {
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "You must be logged in to delete messages",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Verify the message belongs to the current user before deleting
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      if (message.sender_id !== currentUserId) {
        throw new Error('You can only delete your own messages');
      }

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Message deleted successfully"
      });
    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  // React to message function
  const reactToMessage = async (messageId: string, emoji: string): Promise<void> => {
    if (!currentUserId) return;

    try {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (!messages) return;

      const currentReactions = messages.reactions as Record<string, string[]> || {};
      const currentUsers = currentReactions[emoji] || [];
      
      let updatedUsers;
      if (currentUsers.includes(currentUserId)) {
        updatedUsers = currentUsers.filter(id => id !== currentUserId);
      } else {
        updatedUsers = [...currentUsers, currentUserId];
      }

      const updatedReactions = {
        ...currentReactions,
        [emoji]: updatedUsers
      };

      if (updatedUsers.length === 0) {
        delete updatedReactions[emoji];
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('[Chat] Error updating reaction:', error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  // Handle mentions
  const markMentionsAsRead = async (): Promise<void> => {
    if (!currentUserId || !channelId) return;

    try {
      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', currentUserId)
        .eq('channel_id', channelId)
        .eq('status', 'unread');

      if (error) {
        console.error('[Chat] Error marking mentions as read:', error);
      }
    } catch (error) {
      console.error('[Chat] Error marking mentions as read:', error);
    }
  };

  return {
    messages: filteredMessages(),
    isLoading,
    isUploading,
    replyTo,
    setReplyTo,
    sendMessage,
    deleteMessage,
    reactToMessage,
    markMentionsAsRead,
    currentUserId
  };
};
