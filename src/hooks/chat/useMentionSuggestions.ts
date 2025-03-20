
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Suggestion, MemberSuggestion, LanguageSuggestion } from '@/types/chat';

export function useMentionSuggestions(channelId: string) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchSuggestions = useCallback(async (query: string) => {
    console.log(`Fetching mention suggestions for query: "${query}" in channel: ${channelId}`);
    setLoading(true);

    try {
      // Get channel members that match the query
      const { data: members, error: membersError } = await supabase
        .rpc('get_channel_members', { channel_id: channelId });

      if (membersError) {
        console.error('Error fetching channel members for suggestions:', membersError);
        throw membersError;
      }

      console.log(`Found ${members?.length || 0} channel members for suggestions`);

      // Get target languages available in this channel
      const { data: languages, error: languagesError } = await supabase
        .rpc('get_channel_target_languages', { channel_id: channelId });

      if (languagesError) {
        console.error('Error fetching channel languages for suggestions:', languagesError);
        throw languagesError;
      }

      console.log(`Found ${languages?.length || 0} languages for suggestions`);

      // If query is empty, show all members and languages
      if (!query) {
        const memberSuggestions: MemberSuggestion[] = members.map(member => ({
          id: member.user_id,
          name: `${member.first_name} ${member.last_name}`.trim(),
          email: member.email,
          role: member.role
        }));

        const languageSuggestions: LanguageSuggestion[] = languages.map(lang => ({
          languageName: lang.target_language
        }));

        setSuggestions([...memberSuggestions, ...languageSuggestions]);
        return;
      }

      // Filter members by the query
      const filteredMembers = members.filter(member => {
        const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
        return fullName.includes(query.toLowerCase());
      });

      // Filter languages by the query
      const filteredLanguages = languages.filter(lang => 
        lang.target_language.toLowerCase().includes(query.toLowerCase())
      );

      console.log(`Filtered to ${filteredMembers.length} members and ${filteredLanguages.length} languages matching "${query}"`);

      // Convert to suggestion format
      const memberSuggestions: MemberSuggestion[] = filteredMembers.map(member => ({
        id: member.user_id,
        name: `${member.first_name} ${member.last_name}`.trim(),
        email: member.email,
        role: member.role
      }));

      const languageSuggestions: LanguageSuggestion[] = filteredLanguages.map(lang => ({
        languageName: lang.target_language
      }));

      // Set combined suggestions
      setSuggestions([...memberSuggestions, ...languageSuggestions]);
    } catch (error) {
      console.error('Error fetching mention suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  const resetSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    loading,
    fetchSuggestions,
    resetSuggestions
  };
}
