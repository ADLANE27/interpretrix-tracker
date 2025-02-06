import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Send, Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { MentionSuggestions } from '@/components/chat/MentionSuggestions';
import { supabase } from '@/integrations/supabase/client';

interface ChatProps {
  channelId: string;
}

export const InterpreterChat = ({ channelId }: ChatProps) => {
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
  const { messages, sendMessage, deleteMessage, currentUserId, markMentionsAsRead } = useChat(channelId);

  useEffect(() => {
    if (channelId && currentUserId) {
      markMentionsAsRead();
    }
  }, [channelId, currentUserId, markMentionsAsRead]);

  const fetchMentionSuggestions = async (search: string) => {
    try {
      if (!channelId) return;

      const { data: languages, error: languagesError } = await supabase
        .rpc('get_channel_target_languages', { channel_id: channelId });

      if (languagesError) {
        console.error('[InterpreterChat] Error fetching languages:', languagesError);
      }

      const { data: members, error: membersError } = await supabase
        .rpc('get_channel_members', { channel_id: channelId });

      if (membersError) {
        console.error('[InterpreterChat] Error fetching members:', membersError);
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
      console.error('[InterpreterChat] Error in fetchMentionSuggestions:', error);
      setMentionSuggestions([]);
    }
  };

  const handleMentionSelect = (suggestion: any) => {
    const beforeMention = message.substring(0, message.lastIndexOf('@'));
    const afterMention = message.substring(cursorPosition);
    setMessage(`${beforeMention}@${suggestion.name} ${afterMention}`);
    setShowMentions(false);
    textareaRef.current?.focus();
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
      console.error('[InterpreterChat] Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
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
      console.error('[InterpreterChat] Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
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
          <div key={message.id} className="mb-4 group">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold">{message.sender.name}</div>
                <div className="mt-1">{message.content}</div>
              </div>
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
                  onEmojiSelect={(emoji: any) => setMessage(prev => prev + emoji.native)}
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