
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Send, Smile, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { MentionSuggestions } from './MentionSuggestions';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ChatProps {
  channelId: string;
}

export const Chat = ({ channelId }: ChatProps) => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<Array<{
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'interpreter';
    type?: 'language';
  }>>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { messages, sendMessage, deleteMessage, currentUserId, reactToMessage, markMentionsAsRead } = useChat(channelId);

  useEffect(() => {
    if (channelId && currentUserId) {
      markMentionsAsRead();
    }
  }, [channelId, currentUserId, markMentionsAsRead]);

  const fetchMentionSuggestions = async (search: string) => {
    try {
      if (!channelId) {
        console.warn('[Chat Debug] No channel ID provided');
        setMentionSuggestions([]);
        return;
      }

      // Fetch target languages for the channel
      const { data: languages, error: languagesError } = await supabase
        .rpc('get_channel_target_languages', { channel_id: channelId });

      if (languagesError) {
        console.error('[Chat Debug] Error fetching languages:', languagesError);
      }

      // Fetch channel members
      const { data: members, error: membersError } = await supabase
        .rpc('get_channel_members', { channel_id: channelId });

      if (membersError) {
        console.error('[Chat Debug] Error fetching members:', membersError);
        setMentionSuggestions([]);
        return;
      }

      const suggestions: Array<{
        id: string;
        name: string;
        email: string;
        role: 'admin' | 'interpreter';
        type?: 'language';
      }> = [];

      // Add language suggestions
      if (languages) {
        const languageSuggestions = languages
          .filter(lang => 
            lang.target_language.toLowerCase().includes(search.toLowerCase())
          )
          .map(lang => ({
            id: `lang_${lang.target_language}`,
            name: lang.target_language,
            email: '',
            role: 'interpreter' as const,
            type: 'language' as const
          }));
        suggestions.push(...languageSuggestions);
      }

      // Add member suggestions
      if (Array.isArray(members)) {
        const memberSuggestions = members
          .filter(member => {
            const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
            return fullName.includes(search.toLowerCase()) || 
                   member.email.toLowerCase().includes(search.toLowerCase());
          })
          .map(member => ({
            id: member.user_id,
            name: `${member.first_name} ${member.last_name}`,
            email: member.email,
            role: member.role as 'admin' | 'interpreter'
          }));
        suggestions.push(...memberSuggestions);
      }

      setMentionSuggestions(suggestions);
    } catch (error) {
      console.error('[Chat Debug] Error in fetchMentionSuggestions:', error);
      setMentionSuggestions([]);
    }
  };

  const handleMentionSelect = async (suggestion: any) => {
    try {
      const beforeMention = message.substring(0, message.lastIndexOf('@'));
      const afterMention = message.substring(cursorPosition);
      
      if (suggestion.type === 'language') {
        // Add the language mention directly
        const mentionText = `@${suggestion.name}`;
        setMessage(`${beforeMention}${mentionText} ${afterMention}`);
        
        // Get interpreters for this language in the background
        const { data: interpreters, error } = await supabase
          .rpc('get_channel_interpreters_by_language', {
            p_channel_id: channelId,
            p_target_language: suggestion.name
          });

        if (error) {
          console.error('[Chat Debug] Error fetching interpreters:', error);
          toast({
            title: "Erreur",
            description: "Impossible de récupérer les interprètes pour cette langue",
            variant: "destructive",
          });
          return;
        }

        // Store interpreters to be notified when the message is sent
        if (interpreters && interpreters.length > 0) {
          const interpreterIds = interpreters.map(interpreter => interpreter.user_id);
          console.log('[Chat Debug] Found interpreters for language:', interpreterIds);
        }
      } else {
        // Regular user mention
        setMessage(`${beforeMention}@${suggestion.name} ${afterMention}`);
      }
      
      setShowMentions(false);
      textareaRef.current?.focus();
    } catch (error) {
      console.error('[Chat Debug] Error in handleMentionSelect:', error);
      toast({
        title: "Erreur",
        description: "Impossible de traiter la mention",
        variant: "destructive",
      });
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    setCursorPosition(e.target.selectionStart);

    const lastAtSymbol = newMessage.lastIndexOf('@', e.target.selectionStart);
    if (lastAtSymbol !== -1 && lastAtSymbol === newMessage.lastIndexOf('@')) {
      const searchTerm = newMessage.substring(lastAtSymbol + 1, e.target.selectionStart);
      setMentionSearch(searchTerm);
      setShowMentions(true);
      fetchMentionSuggestions(searchTerm);
    } else {
      setShowMentions(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-chat-attachment', {
        body: formData,
      });

      if (uploadError) throw uploadError;

      const attachment = {
        url: uploadData.url,
        filename: file.name,
        type: file.type,
        size: file.size
      };

      await sendMessage(message, undefined, [attachment]);
      setMessage('');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le fichier",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !fileInputRef.current?.files?.length) return;

    try {
      await sendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      toast({
        title: "Succès",
        description: "Message supprimé",
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage(prev => prev + emoji.native);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1 p-4">
        {messages.map(message => (
          <div 
            key={message.id} 
            id={`message-${message.id}`}
            className="mb-4 group transition-colors duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{message.sender.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(message.timestamp, 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
                <div className="mt-1">{message.content}</div>
              </div>
              {currentUserId === message.sender.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteMessage(message.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </ScrollArea>

      <div className="border-t p-4 bg-white">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            placeholder="Écrivez votre message..."
            className="min-h-[80px]"
          />

          <MentionSuggestions
            suggestions={mentionSuggestions}
            onSelect={handleMentionSelect}
            visible={showMentions}
          />

          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="end">
                <Picker
                  data={data}
                  onEmojiSelect={handleEmojiSelect}
                  theme="light"
                />
              </PopoverContent>
            </Popover>

            <Button 
              onClick={handleSendMessage}
              disabled={isUploading || (!message.trim() && !fileInputRef.current?.files?.length)}
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
