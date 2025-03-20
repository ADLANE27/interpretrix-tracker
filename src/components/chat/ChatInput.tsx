
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
import { useToast } from "@/hooks/use-toast";
import { playNotificationSound } from "@/utils/notificationSound";

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
  const { toast } = useToast();
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

  const debouncedFetchSuggestions = useCallback(
    debounce((searchTerm: string, channelId: string) => {
      fetchMentionSuggestions(searchTerm, channelId);
    }, 150),
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    checkForMentions(newMessage, cursorPos);
  };

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
      
      const { data: channelMembers, error: membersError } = await supabase
        .rpc('get_channel_members', { channel_id: channelId });
        
      if (membersError) {
        console.error('Error fetching channel members via RPC:', membersError);
        setIsLoadingSuggestions(false);
        return;
      }
      
      if (!channelMembers || channelMembers.length === 0) {
        console.log("No members found in channel");
        setSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }
      
      const adminMembers = channelMembers.filter(member => member.role === 'admin');
      const interpreterMembers = channelMembers.filter(member => member.role === 'interpreter');
      
      const interpreterSuggestions: MemberSuggestion[] = interpreterMembers.map(interpreter => ({
        id: interpreter.user_id,
        name: `${interpreter.first_name} ${interpreter.last_name}`,
        email: interpreter.email,
        role: 'interpreter' as 'interpreter'
      }));
      
      const adminSuggestions: MemberSuggestion[] = adminMembers.map(admin => ({
        id: admin.user_id,
        name: `${admin.first_name} ${admin.last_name}`,
        email: admin.email,
        role: 'admin' as 'admin'
      }));
      
      const allSuggestions = [...interpreterSuggestions, ...adminSuggestions];
      
      if (interpreterMembers.length > 0) {
        const interpreterIds = interpreterMembers.map(m => m.user_id);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('interpreter_profiles')
          .select('id, profile_picture_url')
          .in('id', interpreterIds);
          
        if (!profilesError && profilesData) {
          const pictureMap = new Map(
            profilesData.map(profile => [profile.id, profile.profile_picture_url])
          );
          
          allSuggestions.forEach(suggestion => {
            if (suggestion.role === 'interpreter' && pictureMap.has(suggestion.id)) {
              suggestion.avatarUrl = pictureMap.get(suggestion.id) || undefined;
            }
          });
        }
      }
      
      const filteredSuggestions = searchTerm 
        ? allSuggestions.filter(suggestion => {
            const normalizedName = suggestion.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normalizedSearch = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return normalizedName.includes(normalizedSearch);
          })
        : allSuggestions;
      
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
      insertText = `@${suggestion.name} `;
    } else {
      // Add special format for admin users to ensure correct routing
      if (suggestion.role === 'admin') {
        insertText = `@admin:${suggestion.name} `;
      } else {
        insertText = `@${suggestion.name} `;
      }
    }
    
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

  const handleEmojiSelect = (emoji: any) => {
    setMessage(message + emoji.native);
    setEmojiPickerOpen(false);
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

  return (
    <div className="p-3 bg-white dark:bg-gray-900">
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-300">
          <span className="truncate flex-1">En réponse à : {replyTo.sender.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyTo(null)}
            className="h-6 px-2 text-xs hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Annuler
          </Button>
        </div>
      )}
      <div className="relative">
        <div className="flex items-end rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 shadow-sm focus-within:ring-1 focus-within:ring-purple-500 focus-within:border-purple-500">
          <div className="flex-1 min-h-[40px] flex items-end">
            <Textarea
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              placeholder="Écrivez un message..."
              className="resize-none border-0 focus-visible:ring-0 shadow-none min-h-[40px] py-2.5 px-3 text-base rounded-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  
                  const formattedMessage = formatMessage(message);
                  setMessage(formattedMessage);
                  
                  onSendMessage();
                }
              }}
            />
          </div>
          <div className="flex items-center p-1.5 pr-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-purple-500 rounded-full"
              onClick={() => {
                const textarea = inputRef.current;
                if (textarea) {
                  const cursorPos = textarea.selectionStart || 0;
                  const textBeforeCursor = message.substring(0, cursorPos);
                  const textAfterCursor = message.substring(cursorPos);
                  const newMessage = textBeforeCursor + '@' + textAfterCursor;
                  setMessage(newMessage);
                  
                  setTimeout(() => {
                    textarea.focus();
                    const newPos = cursorPos + 1;
                    textarea.setSelectionRange(newPos, newPos);
                    setCursorPosition(newPos);
                    
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
                  className="h-8 w-8 text-gray-500 hover:text-purple-500 rounded-full"
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
              className="h-8 w-8 text-gray-500 hover:text-purple-500 rounded-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-9 w-9 ml-1 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center"
              onClick={() => {
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
        <div className="mt-2 space-y-1.5 px-1">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center gap-2 text-sm py-1.5 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 hover:text-red-500 px-2"
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
