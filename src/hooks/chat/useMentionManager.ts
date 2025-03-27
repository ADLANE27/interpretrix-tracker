
import { useState, useRef, useEffect, useCallback } from 'react';
import { MemberSuggestion, Suggestion } from "@/types/messaging";
import { supabase } from "@/integrations/supabase/client";
import { debounce } from "@/lib/utils";

export const useMentionManager = (inputRef: React.RefObject<HTMLTextAreaElement>) => {
  const [mentionSuggestionsVisible, setMentionSuggestionsVisible] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);

  const debouncedFetchSuggestions = useCallback(
    debounce((searchTerm: string, channelId: string) => {
      fetchMentionSuggestions(searchTerm, channelId);
    }, 150),
    []
  );

  const checkForMentions = (text: string, cursorPos: number) => {
    const textBeforeCursor = text.substring(0, cursorPos);
    
    const mentionMatch = textBeforeCursor.match(/@([^\s]*)$/);
    
    if (mentionMatch) {
      const searchTerm = mentionMatch[1];
      setMentionSearchTerm(searchTerm);
      setMentionStartIndex(mentionMatch.index || 0);
      setMentionSuggestionsVisible(true);
      
      const channelId = document.querySelector('#messages-container')?.getAttribute('data-channel-id');
      if (channelId) {
        setCurrentChannelId(channelId);
        setIsLoadingSuggestions(true);
        debouncedFetchSuggestions(searchTerm, channelId);
      }
    } else {
      if (mentionSuggestionsVisible) {
        setMentionSuggestionsVisible(false);
        setMentionSearchTerm('');
      }
    }
  };

  const fetchMentionSuggestions = async (searchTerm: string, channelId: string) => {
    try {
      setIsLoadingSuggestions(true);
      console.log("Fetching suggestions for", searchTerm, "in channel", channelId);
      
      const { data: members, error: membersError } = await supabase
        .from('channel_members')
        .select(`
          user_id
        `)
        .eq('channel_id', channelId);

      if (membersError) {
        console.error('Error fetching channel members:', membersError);
        setIsLoadingSuggestions(false);
        return;
      }
      
      if (!members || members.length === 0) {
        console.log("No members found in channel");
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
        console.error('Error fetching interpreter profiles:', interpretersError);
      }

      if (adminsError) {
        console.error('Error fetching admin profiles:', adminsError);
      }

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', memberIds);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
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
      
      const normalizeString = (str: string) => {
        return str.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
      };
      
      const filteredSuggestions = searchTerm 
        ? combinedSuggestions.filter(suggestion => {
            const normalizedName = normalizeString(suggestion.name);
            const normalizedSearch = normalizeString(searchTerm);
            return normalizedName.includes(normalizedSearch);
          })
        : combinedSuggestions;
      
      console.log("Found suggestions:", filteredSuggestions.length);
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Error fetching mention suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleMentionSelect = (
    suggestion: Suggestion, 
    message: string, 
    setMessage: (message: string) => void
  ) => {
    if (!inputRef.current) return;
    
    const cursorPos = cursorPosition;
    const textBeforeMention = message.substring(0, mentionStartIndex);
    const textAfterCursor = message.substring(cursorPos);
    
    const insertText = `@${(suggestion as MemberSuggestion).name} `;
    
    const newMessage = textBeforeMention + insertText + textAfterCursor;
    setMessage(newMessage);
    
    setMentionSuggestionsVisible(false);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = textBeforeMention.length + insertText.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPosition(newCursorPos);
      }
    }, 0);
  };

  const triggerMention = (message: string, setMessage: (message: string) => void) => {
    if (!inputRef.current) return;
    
    const cursorPos = inputRef.current.selectionStart || 0;
    const textBeforeCursor = message.substring(0, cursorPos);
    const textAfterCursor = message.substring(cursorPos);
    
    const newMessage = textBeforeCursor + '@' + textAfterCursor;
    setMessage(newMessage);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = cursorPos + 1;
        inputRef.current.setSelectionRange(newPos, newPos);
        setCursorPosition(newPos);
        
        checkForMentions(newMessage, newPos);
      }
    }, 0);
  };

  const handleSelectionChange = () => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart || 0);
    }
  };

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    
    textarea.addEventListener('click', handleSelectionChange);
    textarea.addEventListener('keyup', handleSelectionChange);
    
    return () => {
      textarea.removeEventListener('click', handleSelectionChange);
      textarea.removeEventListener('keyup', handleSelectionChange);
    };
  }, [inputRef]);

  return {
    mentionSuggestionsVisible,
    mentionSearchTerm,
    suggestions,
    isLoadingSuggestions,
    checkForMentions,
    handleMentionSelect,
    triggerMention,
    setCursorPosition,
    cursorPosition
  };
};
