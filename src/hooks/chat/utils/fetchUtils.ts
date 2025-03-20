
import { supabase } from "@/integrations/supabase/client";
import { MessageData } from '@/types/messaging';
import { Json } from '@/integrations/supabase/types.generated';

// Helper to convert from database message to MessageData
export const convertToMessageData = (dbMessage: any): MessageData => {
  return {
    id: dbMessage.id,
    content: dbMessage.content,
    sender_id: dbMessage.sender_id,
    created_at: dbMessage.created_at,
    parent_message_id: dbMessage.parent_message_id,
    reactions: dbMessage.reactions,
    channel_id: dbMessage.channel_id,
    attachments: dbMessage.attachments ? dbMessage.attachments.map((attachment: Json) => {
      if (typeof attachment === 'object' && attachment !== null) {
        return attachment as any;
      }
      return {
        url: '',
        filename: '',
        type: '',
        size: 0
      };
    }) : []
  };
};

// Fetch channel type from the database
export const fetchChannelType = async (channelId: string): Promise<'group' | 'direct'> => {
  const { data: channel, error } = await supabase
    .from('chat_channels')
    .select('channel_type')
    .eq('id', channelId)
    .single();

  if (error) {
    console.error('[fetchUtils] Error fetching channel:', error);
    return 'group'; // Default to group if there's an error
  }

  return channel.channel_type as 'group' | 'direct';
};

// Fetch messages from the database
export const fetchMessagesFromDb = async (channelId: string, limit: number = 100) => {
  console.log(`[fetchUtils] Fetching messages with limit: ${limit}`);
  
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[fetchUtils] Error fetching messages:', error);
    throw error;
  }

  console.log(`[fetchUtils] Fetched ${messages?.length || 0} messages`);
  return messages || [];
};

// Additional utility to help with sorting messages by timestamp
export const sortMessagesByTimestamp = (messages: any[]) => {
  return [...messages].sort((a, b) => {
    // Use created_at for database records
    if (a.created_at && b.created_at) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    // Use timestamp for processed Message objects
    if (a.timestamp && b.timestamp) {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    return 0;
  });
};
