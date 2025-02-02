import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Channel } from '../types';

export const useChannels = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const { toast } = useToast();

  const fetchChannels = async () => {
    try {
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('*');

      if (channelsError) throw channelsError;
      setChannels(channelsData || []);
    } catch (error) {
      console.error("Error fetching channels:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les canaux",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  return { channels };
};