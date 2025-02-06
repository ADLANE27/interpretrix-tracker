
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export interface Channel {
  id: string;
  name: string;
  description: string | null;
}

export const useChannels = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const { toast } = useToast();

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['isUserAdmin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      return roles?.some(r => r.role === 'admin') ?? false;
    }
  });

  // Fetch channels the user has access to through channel_members
  const { data: channels = [], refetch: fetchChannels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Chat Debug] No user found');
        return [];
      }

      const { data: memberChannels, error } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('[Chat Debug] Error fetching channel members:', error);
        throw error;
      }

      if (!memberChannels || memberChannels.length === 0) {
        console.log('[Chat Debug] No channels found for user');
        return [];
      }

      const channelIds = memberChannels.map(mc => mc.channel_id);
      
      const { data: channels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('*')
        .in('id', channelIds)
        .order('name');

      if (channelsError) {
        console.error('[Chat Debug] Error fetching channels:', channelsError);
        throw channelsError;
      }

      return channels;
    },
    retry: 1
  });

  return {
    channels,
    selectedChannelId,
    setSelectedChannelId,
    isAdmin,
    fetchChannels
  };
};
