import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useUnreadMentions = (userId: string | null) => {
  const [unreadMentions, setUnreadMentions] = useState(0);
  const { toast } = useToast();

  const fetchUnreadMentions = async () => {
    try {
      if (!userId) {
        console.log('[MessagingTab] No authenticated user found');
        return;
      }

      // First get interpreter's target languages
      const { data: profile } = await supabase
        .from('interpreter_profiles')
        .select('languages')
        .eq('id', userId)
        .single();

      if (!profile) {
        console.error('[MessagingTab] No interpreter profile found');
        return;
      }

      // Extract target languages from language pairs
      const targetLanguages = profile.languages.map(lang => {
        const [_, target] = lang.split(' → ');
        return target.trim();
      });

      console.log('[MessagingTab] Interpreter target languages:', targetLanguages);

      // Count both direct mentions and language mentions
      const { count, error } = await supabase
        .from('message_mentions')
        .select('*', { count: 'exact', head: true })
        .or(`mentioned_user_id.eq.${userId},mentioned_language.in.(${targetLanguages.map(lang => `"${lang}"`).join(',')})`)
        .is('read_at', null)
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('[MessagingTab] Error fetching mentions:', error);
        throw error;
      }

      console.log('[MessagingTab] Found unread mentions:', count);
      setUnreadMentions(count || 0);
    } catch (error) {
      console.error("[MessagingTab] Error in fetchUnreadMentions:", error);
      toast({
        title: "Error",
        description: "Could not fetch unread mentions",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUnreadMentions();
      console.log('[MessagingTab] Setting up realtime subscriptions for user:', userId);

      const mentionsChannel = supabase
        .channel('mentions-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_mentions'
          },
          async (payload) => {
            console.log('[MessagingTab] New mention received:', payload);
            
            // Check if it's a direct mention
            if (payload.new.mentioned_user_id === userId) {
              console.log('[MessagingTab] Direct mention detected');
              fetchUnreadMentions();
              return;
            }

            // Check if it's a language mention that matches interpreter's languages
            const { data: profile } = await supabase
              .from('interpreter_profiles')
              .select('languages')
              .eq('id', userId)
              .single();

            if (profile && profile.languages) {
              const targetLanguages = profile.languages.map(lang => {
                const [_, target] = lang.split(' → ');
                return target.trim();
              });

              console.log('[MessagingTab] Checking language mention:', payload.new.mentioned_language);
              console.log('[MessagingTab] Against target languages:', targetLanguages);

              if (payload.new.mentioned_language && targetLanguages.includes(payload.new.mentioned_language)) {
                console.log('[MessagingTab] Language mention matches interpreter target language');
                fetchUnreadMentions();
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('[MessagingTab] Mentions subscription status:', status);
        });

      return () => {
        console.log('[MessagingTab] Cleaning up subscriptions');
        supabase.removeChannel(mentionsChannel);
      };
    }
  }, [userId]);

  return { unreadMentions };
};