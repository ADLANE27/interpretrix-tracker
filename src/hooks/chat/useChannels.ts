
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
      if (!user) {
        console.log('[Chat Debug] No authenticated user found');
        return false;
      }
      console.log('[Chat Debug] Checking admin status for user:', user.id);

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('[Chat Debug] Error checking admin role:', error);
        return false;
      }

      const isAdmin = roles?.some(r => r.role === 'admin') ?? false;
      console.log('[Chat Debug] User is admin:', isAdmin);
      return isAdmin;
    }
  });

  // Fetch channels - now with detailed logging
  const { data: channels = [], refetch: fetchChannels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      console.log('[Chat Debug] Starting to fetch channels');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Chat Debug] No authenticated user found while fetching channels');
        return [];
      }
      console.log('[Chat Debug] Fetching channels for user:', user.id);

      // First check which channels the user is a member of
      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('[Chat Debug] Error fetching channel memberships:', memberError);
        throw memberError;
      }

      console.log('[Chat Debug] User is member of channels:', memberChannels);

      // Then fetch the actual channels
      const { data: channels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('*')
        .order('name');

      if (channelsError) {
        console.error('[Chat Debug] Error fetching channels:', channelsError);
        throw channelsError;
      }

      console.log('[Chat Debug] Successfully fetched channels:', channels);
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
