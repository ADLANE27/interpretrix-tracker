
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication status first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.log('[Chat Debug] Auth error:', authError);
          setIsAuthenticated(false);
          return;
        }
        setIsAuthenticated(!!user);
      } catch (error) {
        console.log('[Chat Debug] Error checking auth:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check if user is admin
  const { data: isAdmin, isLoading: isAdminLoading } = useQuery({
    queryKey: ['isUserAdmin'],
    queryFn: async () => {
      if (!isAuthenticated) {
        console.log('[Chat Debug] Not authenticated for admin check');
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Chat Debug] No authenticated user found');
        return false;
      }
      console.log('[Chat Debug] Checking admin status for user:', user.id);

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('[Chat Debug] Error checking admin role:', error);
        return false;
      }

      const isAdmin = roles?.role === 'admin';
      console.log('[Chat Debug] User is admin:', isAdmin);
      return isAdmin;
    },
    enabled: isAuthenticated === true, // Only run when authenticated
    retry: 1
  });

  // Fetch channels - now with detailed logging and authentication check
  const { data: channels = [], isLoading: isChannelsLoading, refetch: fetchChannels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      console.log('[Chat Debug] Authentication status for channel fetch:', isAuthenticated);
      if (!isAuthenticated) {
        console.log('[Chat Debug] Not authenticated, skipping channel fetch');
        return [];
      }
      
      console.log('[Chat Debug] Starting to fetch channels');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Chat Debug] No authenticated user found while fetching channels');
        return [];
      }
      console.log('[Chat Debug] Fetching channels for user:', user.id);

      // Get channels user is a member of
      const { data: channels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('*')
        .order('name');

      if (channelsError) {
        console.error('[Chat Debug] Error fetching channels:', channelsError);
        toast({
          title: "Error",
          description: "Failed to fetch channels",
          variant: "destructive",
        });
        throw channelsError;
      }

      console.log('[Chat Debug] Successfully fetched channels:', channels);
      return channels;
    },
    enabled: isAuthenticated === true, // Only run when authenticated
    retry: 1
  });

  return {
    channels,
    selectedChannelId,
    setSelectedChannelId,
    isAdmin,
    fetchChannels,
    isLoading: isAdminLoading || isChannelsLoading,
    isAuthenticated
  };
};
