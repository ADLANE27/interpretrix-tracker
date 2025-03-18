
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSuggestion } from "@/types/messaging";

export const useChannelLanguages = (channelId: string | null) => {
  const { data: channelLanguages = [], isLoading, error } = useQuery({
    queryKey: ['channel-languages', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      console.log('Fetching languages for channel:', channelId);
      
      // Get all unique languages (source and target) from channel members
      // Note: we use rpc directly with type checking for the result
      const sourceLangs = await supabase.rpc('get_channel_source_languages', { 
        p_channel_id: channelId 
      });
      
      const targetLangs = await supabase.rpc('get_channel_target_languages', { 
        channel_id: channelId 
      });
      
      if (sourceLangs.error) {
        console.error('Error fetching source languages:', sourceLangs.error);
      }
      
      if (targetLangs.error) {
        console.error('Error fetching target languages:', targetLangs.error);
      }

      // Combine source and target languages with deduplication
      const allLanguages = new Map<string, LanguageSuggestion>();
      
      // Add source languages with proper type checking
      if (sourceLangs.data && Array.isArray(sourceLangs.data)) {
        sourceLangs.data.forEach((lang: { source_language: string }) => {
          if (lang.source_language && lang.source_language.trim() !== '') {
            allLanguages.set(lang.source_language.toLowerCase(), {
              name: lang.source_language,
              type: 'language'
            });
          }
        });
      }
      
      // Add target languages with proper type checking
      if (targetLangs.data && Array.isArray(targetLangs.data)) {
        targetLangs.data.forEach((lang: { target_language: string }) => {
          if (lang.target_language && lang.target_language.trim() !== '') {
            allLanguages.set(lang.target_language.toLowerCase(), {
              name: lang.target_language,
              type: 'language'
            });
          }
        });
      }
      
      // Convert Map to array of LanguageSuggestion
      const result = Array.from(allLanguages.values());
      console.log('Channel languages:', result.length);
      return result;
    },
    enabled: !!channelId,
  });

  return {
    languages: channelLanguages,
    isLoading,
    error
  };
};
