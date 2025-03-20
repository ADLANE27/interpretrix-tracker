
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useChannelData = (channelId: string) => {
  const { data: channel, isLoading, error } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('id', channelId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  return {
    channel,
    isLoading,
    error,
    channelName: channel?.name,
    channelType: (channel?.channel_type || 'group') as 'group' | 'direct'
  };
};
