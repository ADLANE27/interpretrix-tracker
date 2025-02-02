import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChatHistory } from '../types';

export const useChatHistory = (userId: string | null) => {
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const { toast } = useToast();

  const fetchChatHistory = async () => {
    try {
      if (!userId) return;

      const { data: messageUsers, error: msgError } = await supabase
        .from('direct_messages')
        .select('sender_id, recipient_id')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);

      if (msgError) throw msgError;

      const uniqueUserIds = new Set<string>();
      messageUsers?.forEach(msg => {
        const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
        uniqueUserIds.add(otherId);
      });

      // Fetch admin roles for these users
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', Array.from(uniqueUserIds))
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminIds = new Set(userRoles?.map(role => role.user_id) || []);

      const { data: profiles, error: profileError } = await supabase
        .from('interpreter_profiles')
        .select('id, first_name, last_name')
        .in('id', Array.from(uniqueUserIds));

      if (profileError) throw profileError;

      const history: ChatHistory[] = [];

      // Add interpreter profiles
      profiles?.forEach(profile => {
        history.push({
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`,
          unreadCount: 0,
          isAdmin: adminIds.has(profile.id)
        });
      });

      // Add admin profiles that might not be in interpreter_profiles
      for (const adminId of adminIds) {
        if (!profiles?.some(p => p.id === adminId)) {
          const { data: adminInfo } = await supabase.functions.invoke('get-user-info', {
            body: { userId: adminId }
          });
          
          if (adminInfo) {
            history.push({
              id: adminId,
              name: `${adminInfo.first_name} ${adminInfo.last_name} (Admin)`,
              unreadCount: 0,
              isAdmin: true
            });
          }
        }
      }

      setChatHistory(history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des conversations",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (userId) {
      fetchChatHistory();
    }
  }, [userId]);

  return { chatHistory, setChatHistory };
};