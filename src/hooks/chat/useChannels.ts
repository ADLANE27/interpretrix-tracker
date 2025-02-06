
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

  // Fetch channels - now simplified with RLS handling access
  const { data: channels = [], refetch: fetchChannels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      console.log('[Chat Debug] Fetching channels');
      
      const { data: channels, error } = await supabase
        .from('chat_channels')
        .select('*')
        .order('name');

      if (error) {
        console.error('[Chat Debug] Error fetching channels:', error);
        throw error;
      }

      console.log('[Chat Debug] Fetched channels:', channels);
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
