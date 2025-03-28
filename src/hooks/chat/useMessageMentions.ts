
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MemberSuggestion, Suggestion } from '@/types/messaging';
import { debounce } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { LANGUAGES } from '@/lib/constants';

export function useMessageMentions() {
  const [mentionSuggestionsVisible, setMentionSuggestionsVisible] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const currentChannelIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  const debouncedFetchSuggestions = useCallback(
    debounce((searchTerm: string, channelId: string) => {
      fetchMentionSuggestions(searchTerm, channelId);
    }, 150),
    []
  );

  const checkForMentions = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.substring(0, cursorPos);
    
    // Improved regex to better match mentions at cursor position
    const mentionMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    
    if (mentionMatch) {
      const searchTerm = mentionMatch[1];
      setMentionSearchTerm(searchTerm);
      setMentionStartIndex(mentionMatch.index || 0);
      setMentionSuggestionsVisible(true);
      
      const channelId = document.querySelector('#messages-container')?.getAttribute('data-channel-id');
      if (channelId) {
        currentChannelIdRef.current = channelId;
        setIsLoadingSuggestions(true);
        debouncedFetchSuggestions(searchTerm, channelId);
      }
    } else {
      if (mentionSuggestionsVisible) {
        setMentionSuggestionsVisible(false);
        setMentionSearchTerm('');
      }
    }
  }, [mentionSuggestionsVisible, debouncedFetchSuggestions]);

  const fetchMentionSuggestions = async (searchTerm: string, channelId: string) => {
    try {
      setIsLoadingSuggestions(true);
      console.log("[useMessageMentions] Fetching suggestions for", searchTerm, "in channel", channelId);
      
      const { data: members, error: membersError } = await supabase
        .from('channel_members')
        .select(`
          user_id
        `)
        .eq('channel_id', channelId);

      if (membersError) {
        console.error('[useMessageMentions] Error fetching channel members:', membersError);
        setIsLoadingSuggestions(false);
        return;
      }
      
      if (!members || members.length === 0) {
        console.log("[useMessageMentions] No members found in channel");
        setSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }
      
      const memberIds = members.map(m => m.user_id);
      
      const { data: interpreters, error: interpretersError } = await supabase
        .from('interpreter_profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          profile_picture_url
        `)
        .in('id', memberIds);
      
      const { data: admins, error: adminsError } = await supabase
        .from('admin_profiles')
        .select(`
          id,
          first_name,
          last_name,
          email
        `)
        .in('id', memberIds);

      if (interpretersError) {
        console.error('[useMessageMentions] Error fetching interpreter profiles:', interpretersError);
      }

      if (adminsError) {
        console.error('[useMessageMentions] Error fetching admin profiles:', adminsError);
      }

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', memberIds);

      if (rolesError) {
        console.error('[useMessageMentions] Error fetching user roles:', rolesError);
      }

      const roleMap = new Map<string, 'admin' | 'interpreter'>();
      if (userRoles) {
        userRoles.forEach(ur => {
          roleMap.set(ur.user_id, ur.role as 'admin' | 'interpreter');
        });
      }

      const interpreterSuggestions: MemberSuggestion[] = (interpreters || []).map(profile => {
        const name = `${profile.first_name} ${profile.last_name}`;
        return {
          id: profile.id,
          name,
          email: profile.email,
          role: roleMap.get(profile.id) || 'interpreter',
          avatarUrl: profile.profile_picture_url || undefined
        };
      });

      const adminSuggestions: MemberSuggestion[] = (admins || []).map(profile => {
        const name = `${profile.first_name} ${profile.last_name}`;
        return {
          id: profile.id,
          name,
          email: profile.email,
          role: roleMap.get(profile.id) || 'admin'
        };
      });

      const combinedSuggestions = [...interpreterSuggestions, ...adminSuggestions];
      
      const filteredSuggestions = searchTerm 
        ? combinedSuggestions.filter(suggestion => {
            const normalizedName = suggestion.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normalizedSearch = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return normalizedName.includes(normalizedSearch);
          })
        : combinedSuggestions;
      
      console.log("[useMessageMentions] Found user suggestions:", filteredSuggestions.length);
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('[useMessageMentions] Error fetching mention suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Simplified function to apply mention formatting with no special handling for complex names
  const handleMentionSelect = (suggestion: Suggestion, message: string, cursorPosition: number) => {
    if (mentionStartIndex === -1) return message;
    
    const textBeforeMention = message.substring(0, mentionStartIndex);
    const textAfterCursor = message.substring(cursorPosition);
    
    // Simple mention insertion, preserving exactly the displayed name regardless of type
    const insertText = `@${suggestion.name} `;
    
    const newMessage = textBeforeMention + insertText + textAfterCursor;
    return newMessage;
  };

  const resetMentionSuggestions = useCallback(() => {
    setMentionSuggestionsVisible(false);
    setMentionSearchTerm('');
    setSuggestions([]);
  }, []);

  return {
    mentionSuggestionsVisible,
    mentionSearchTerm,
    mentionStartIndex,
    suggestions,
    isLoadingSuggestions,
    checkForMentions,
    resetMentionSuggestions,
    setMentionSuggestionsVisible,
    handleMentionSelect,
  };
}
