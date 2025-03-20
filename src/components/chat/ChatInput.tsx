
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Message } from "@/types/messaging";
import { Paperclip, Send, Smile, AtSign } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from "@/components/ui/textarea";
import { MentionSuggestions } from './MentionSuggestions';
import { supabase } from "@/integrations/supabase/client";
import { useMessageFormatter } from "@/hooks/chat/useMessageFormatter";
import { MemberSuggestion, Suggestion } from "@/types/messaging";
import { debounce } from "@/lib/utils";

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSendMessage: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
  handleRemoveAttachment: (index: number) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  message,
  setMessage,
  onSendMessage,
  handleFileChange,
  attachments,
  handleRemoveAttachment,
  inputRef,
  replyTo,
  setReplyTo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [mentionSuggestionsVisible, setMentionSuggestionsVisible] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const { formatMessage } = useMessageFormatter();

  // Create a debounced version of the fetchMentionSuggestions function with reduced timeout
  const debouncedFetchSuggestions = useCallback(
    debounce((searchTerm: string, channelId: string) => {
      fetchMentionSuggestions(searchTerm, channelId);
    }, 150), // Reduced from 300ms to 150ms for better responsiveness
    []
  );

  // Track cursor position when input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    // Update cursor position
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    // Check for mentions only on the onChange event
    checkForMentions(newMessage, cursorPos);
  };

  // Check for mentions in the current text at cursor position
  const checkForMentions = (text: string, cursorPos: number) => {
    const textBeforeCursor = text.substring(0, cursorPos);
    
    // Look for @ symbol followed by text without spaces
    const mentionMatch = textBeforeCursor.match(/@([^\s]*)$/);
    
    if (mentionMatch) {
      const searchTerm = mentionMatch[1];
      setMentionSearchTerm(searchTerm);
      setMentionStartIndex(mentionMatch.index || 0);
      setMentionSuggestionsVisible(true);
      
      // Find which channel we're in by looking at the DOM
      const channelId = document.querySelector('#messages-container')?.getAttribute('data-channel-id');
      if (channelId) {
        setCurrentChannelId(channelId);
        setIsLoadingSuggestions(true);
        debouncedFetchSuggestions(searchTerm, channelId);
      }
    } else {
      // Only hide suggestions if we're not currently in mention mode
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
      
      // First fetch all members in the channel
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
      
      // Get interpreter profiles with better filtering
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
      
      // Get admin profiles with better filtering
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

      // Get user roles to determine who is admin vs interpreter
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', memberIds);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
      }

      // Create a map of user_id to role for easy lookup
      const roleMap = new Map<string, 'admin' | 'interpreter'>();
      if (userRoles) {
        userRoles.forEach(ur => {
          roleMap.set(ur.user_id, ur.role as 'admin' | 'interpreter');
        });
      }

      // Format interpreter suggestions
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

      // Format admin suggestions
      const adminSuggestions: MemberSuggestion[] = (admins || []).map(profile => {
        const name = `${profile.first_name} ${profile.last_name}`;
        return {
          id: profile.id,
          name,
          email: profile.email,
          role: roleMap.get(profile.id) || 'admin'
        };
      });

      // Filter suggestions based on search term
      const combinedSuggestions = [...interpreterSuggestions, ...adminSuggestions];
      
      // Client-side filtering based on search term
      const filteredSuggestions = searchTerm 
        ? combinedSuggestions.filter(suggestion => {
            const normalizedName = suggestion.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normalizedSearch = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

  const handleMentionSelect = (suggestion: Suggestion) => {
    if (!inputRef.current) return;
    
    const cursorPos = cursorPosition;
    const textBeforeMention = message.substring(0, mentionStartIndex);
    const textAfterCursor = message.substring(cursorPos);
    
    let insertText = '';
    
    if ('type' in suggestion && suggestion.type === 'language') {
      // If it's a language suggestion
      insertText = `@${suggestion.name} `;
    } else {
      // If it's a user suggestion
      insertText = `@${suggestion.name} `;
    }
    
    const newMessage = textBeforeMention + insertText + textAfterCursor;
    setMessage(newMessage);
    
    // Close suggestions
    setMentionSuggestionsVisible(false);
    
    // Focus back on the input and move cursor to the end of the inserted mention
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = textBeforeMention.length + insertText.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPosition(newCursorPos);
      }
    }, 0);
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage(message + emoji.native);
    setEmojiPickerOpen(false);
  };

  // Track cursor position when manually moving it
  const handleSelectionChange = () => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart || 0);
    }
  };

  // Update cursor position tracking
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

  return (
    <div className="border-t p-4 bg-white">
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
          <span>En réponse à : {replyTo.sender.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyTo(null)}
          >
            Annuler
          </Button>
        </div>
      )}
      <div className="relative">
        <div className="flex items-end gap-2 bg-white rounded-lg border shadow-sm focus-within:ring-1 focus-within:ring-purple-500 focus-within:border-purple-500">
          <div className="flex-1 min-h-[40px] flex items-end">
            <Textarea
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              placeholder="Écrivez un message..."
              className="resize-none border-0 focus-visible:ring-0 shadow-none min-h-[40px] py-2.5"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  
                  // Format the message before sending (standardize language mentions)
                  const formattedMessage = formatMessage(message);
                  setMessage(formattedMessage);
                  
                  onSendMessage();
                }
              }}
            />
          </div>
          <div className="flex items-center gap-1 p-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-purple-500"
              onClick={() => {
                const textarea = inputRef.current;
                if (textarea) {
                  const cursorPos = textarea.selectionStart || 0;
                  const textBeforeCursor = message.substring(0, cursorPos);
                  const textAfterCursor = message.substring(cursorPos);
                  const newMessage = textBeforeCursor + '@' + textAfterCursor;
                  setMessage(newMessage);
                  
                  // Focus on textarea and place cursor after @
                  setTimeout(() => {
                    textarea.focus();
                    const newPos = cursorPos + 1;
                    textarea.setSelectionRange(newPos, newPos);
                    setCursorPosition(newPos);
                    
                    // Trigger mention suggestions manually
                    checkForMentions(newMessage, newPos);
                  }, 0);
                }
              }}
            >
              <AtSign className="h-5 w-5" />
            </Button>
          
            <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-purple-500"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0" 
                side="top" 
                align="end"
              >
                <Picker
                  data={data}
                  onEmojiSelect={handleEmojiSelect}
                  theme="light"
                  locale="fr"
                  previewPosition="none"
                  skinTonePosition="none"
                  categories={[
                    'frequent',
                    'people',
                    'nature',
                    'foods',
                    'activity',
                    'places',
                    'objects',
                    'symbols',
                    'flags'
                  ]}
                />
              </PopoverContent>
            </Popover>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-purple-500"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-8 w-8 bg-purple-500 hover:bg-purple-600"
              onClick={() => {
                // Format the message before sending
                const formattedMessage = formatMessage(message);
                setMessage(formattedMessage);
                onSendMessage();
              }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {mentionSuggestionsVisible && (
          <MentionSuggestions 
            suggestions={suggestions}
            onSelect={handleMentionSelect}
            visible={mentionSuggestionsVisible}
            loading={isLoadingSuggestions}
            searchTerm={mentionSearchTerm}
          />
        )}
      </div>
      {attachments.length > 0 && (
        <div className="mt-2 space-y-1">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center gap-2 text-sm py-1 px-2 bg-gray-50 rounded">
              <span className="text-gray-700 truncate flex-1">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 hover:text-red-500"
                onClick={() => handleRemoveAttachment(index)}
              >
                Supprimer
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
