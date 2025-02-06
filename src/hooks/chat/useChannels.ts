import { useState, useEffect } from "react";
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
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      
      return roles?.some(r => r.role === 'admin') ?? false;
    }
  });

  // Fetch channels the user has access to
  const { data: channels = [], refetch: fetchChannels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data: userChannels, error } = await supabase
        .from('chat_channels')
        .select('*')
        .order('name');

      if (error) throw error;
      return userChannels;
    }
  });

  return {
    channels,
    selectedChannelId,
    setSelectedChannelId,
    isAdmin,
    fetchChannels
  };
};