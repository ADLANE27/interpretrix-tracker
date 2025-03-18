
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface Channel {
  id: string;
  name: string;
  description: string | null;
}

export const useChannels = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is admin with caching
  const { data: isAdmin = false } = useQuery({
    queryKey: ['isUserAdmin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) return false;
      return roles?.role === 'admin';
    },
    staleTime: Infinity, // Cache this value indefinitely (until logout)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch channels with caching
  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      console.log('[Chat] Fetching channels');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data: channels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('*')
        .order('name');

      if (channelsError) {
        console.error('[Chat] Error fetching channels:', channelsError);
        toast({
          title: "Error",
          description: "Failed to fetch channels",
          variant: "destructive",
        });
        return [];
      }

      return channels;
    },
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Set up realtime subscription for channels
  useEffect(() => {
    const channel = supabase.channel('public:chat_channels')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_channels'
      }, () => {
        // Invalidate cache to refresh channels
        queryClient.invalidateQueries({ queryKey: ['channels'] });
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    channels: channels || [],
    selectedChannelId,
    setSelectedChannelId,
    isAdmin,
    fetchChannels: () => queryClient.invalidateQueries({ queryKey: ['channels'] })
  };
};
