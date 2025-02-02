import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import { MentionInput } from "./MentionInput";
import { supabase } from "@/integrations/supabase/client";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string, file?: File) => void;
  isLoading?: boolean;
  channelId?: string;
}

export const MessageInput = ({ value, onChange, onSend, isLoading, channelId }: MessageInputProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mentionedUsers] = useState(new Set<string>());
  const [mentionedLanguages] = useState(new Set<string>());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      onSend("", file);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (value.trim()) {
      try {
        // First send the message
        onSend(value);

        // Create mentions in the database for users
        if (mentionedUsers.size > 0 || mentionedLanguages.size > 0) {
          const { data: messageData } = await supabase
            .from('messages')
            .select('id')
            .eq('content', value)
            .order('created_at', { ascending: false })
            .limit(1);

          if (messageData && messageData[0]) {
            const messageId = messageData[0].id;

            // Handle direct user mentions
            const userMentions = Array.from(mentionedUsers).map(userId => ({
              message_id: messageId,
              mentioned_user_id: userId
            }));

            // Handle language mentions by finding interpreters with those languages
            if (mentionedLanguages.size > 0) {
              const { data: interpreters } = await supabase
                .from('interpreter_profiles')
                .select('id, languages')
                .filter('languages', 'cs-', `{%${Array.from(mentionedLanguages).join('%,%')}%}`);

              if (interpreters) {
                const languageUserMentions = interpreters.map(interpreter => ({
                  message_id: messageId,
                  mentioned_user_id: interpreter.id,
                  mentioned_language: Array.from(mentionedLanguages)
                    .find(lang => interpreter.languages.some((pair: string) => pair.split('→')[1].trim() === lang))
                }));

                userMentions.push(...languageUserMentions);
              }
            }

            // Insert all mentions
            if (userMentions.length > 0) {
              await supabase
                .from('message_mentions')
                .insert(userMentions);
            }
          }
        }

        // Clear mentions after sending
        mentionedUsers.clear();
        mentionedLanguages.clear();
        onChange("");
      } catch (error) {
        console.error('Error handling mentions:', error);
      }
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    onChange(value + emojiData.emoji);
  };

  const handleMention = (userId: string) => {
    mentionedUsers.add(userId);
  };

  const handleLanguageMention = (language: string) => {
    mentionedLanguages.add(language);
  };

  return (
    <div className="p-4 border-t">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MentionInput
            value={value}
            onChange={onChange}
            onMention={handleMention}
            onLanguageMention={handleLanguageMention}
            className="w-full bg-chat-input border-chat-divider pl-4 pr-20 py-2 focus-visible:ring-chat-selected"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-100"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
            >
              <Paperclip className="h-4 w-4 text-gray-500" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-100"
                >
                  <Smile className="h-4 w-4 text-gray-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="end">
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <Button 
          onClick={handleSend}
          disabled={isLoading || isUploading || !value.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};