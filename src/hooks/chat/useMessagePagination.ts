
import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

// Maximum messages to fetch initially
const MAX_MESSAGES = 100;

const isValidChannelType = (type: string): type is 'group' | 'direct' => {
  return type === 'group' || type === 'direct';
};

export const useMessagePagination = (userRole: React.MutableRefObject<'admin' | 'interpreter' | null>) => {
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchChannelType = async (channelId: string): Promise<'group' | 'direct'> => {
    try {
      const { data: channelData, error: channelError } = await supabase
        .from('chat_channels')
        .select('channel_type, created_by')
        .eq('id', channelId)
        .single();

      if (channelError) throw channelError;

      if (!channelData?.channel_type || !isValidChannelType(channelData.channel_type)) {
        throw new Error('Invalid channel type');
      }

      return channelData.channel_type;
    } catch (error) {
      console.error(`[useChat ${userRole.current}] Error fetching channel type:`, error);
      return 'group'; // Default to group as fallback
    }
  };

  const getMessageCount = async (channelId: string): Promise<number> => {
    try {
      const { count, error: countError } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', channelId);

      if (countError) throw countError;
      return count || 0;
    } catch (error) {
      console.error(`[useChat ${userRole.current}] Error getting message count:`, error);
      return 0;
    }
  };

  const fetchMessageBatch = async (channelId: string, offset = 0, limit = MAX_MESSAGES) => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false }) // First get newest messages
        .range(offset, offset + limit - 1); // Use range for pagination

      if (messagesError) {
        console.error(`[useChat ${userRole.current}] Error fetching messages:`, messagesError);
        throw messagesError;
      }
      
      return messagesData || [];
    } catch (error) {
      console.error(`[useChat ${userRole.current}] Error in fetchMessageBatch:`, error);
      return [];
    }
  };

  return {
    fetchChannelType,
    getMessageCount,
    fetchMessageBatch,
    hasMoreMessages,
    setHasMoreMessages,
    isLoading,
    setIsLoading,
    MAX_MESSAGES
  };
};
