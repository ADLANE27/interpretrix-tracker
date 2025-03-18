
import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MentionSuggestions } from "@/components/chat/MentionSuggestions";

interface MessageSender {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  channel_id: string;
  sender_id: string;
  parent_message_id?: string | null;
  sender?: MessageSender;
}

// Ensure these types match exactly with those in MentionSuggestions.tsx
interface MemberSuggestion {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'interpreter';
}

interface LanguageSuggestion {
  id: string;
  name: string;
  type: 'language';
}

type Suggestion = MemberSuggestion | LanguageSuggestion;

interface ChatComposerProps {
  newMessage: string;
  replyTo: Message | null;
  isUploading: boolean;
  showMentions: boolean;
  suggestions: Suggestion[];
  onUpdateMessage: (message: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onCancelReply: () => void;
  onSelectMention: (suggestion: Suggestion) => void;
  onEmojiSelect: (emoji: any) => void;
  onFileSelect: () => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  newMessage,
  replyTo,
  isUploading,
  showMentions,
  suggestions,
  onUpdateMessage,
  onSendMessage,
  onCancelReply,
  onSelectMention,
  onEmojiSelect,
  onFileSelect,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-t p-4 bg-background safe-area-bottom">
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-accent/50 rounded-lg">
          <span className="text-sm text-muted-foreground truncate flex-1">
            En réponse à : {replyTo.sender?.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelReply}
            className="h-6 px-2 text-xs"
          >
            Annuler
          </Button>
        </div>
      )}
      <form onSubmit={onSendMessage}>
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => onUpdateMessage(e.target.value)}
              placeholder="Écrivez un message..."
              className="pr-24"
            />
            {showMentions && (
              <MentionSuggestions
                suggestions={suggestions}
                onSelect={onSelectMention}
                visible={showMentions}
              />
            )}
            <div className="absolute right-2 bottom-1/2 translate-y-1/2 flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" side="top" align="end">
                  {/* Using an any type here since we don't have the specific Emoji Picker type */}
                  {React.createElement('div', {
                    style: { width: '352px' },
                    children: 'Emoji Picker will render here'
                  })}
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onFileSelect}
                disabled={isUploading}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button
                type="submit"
                size="icon"
                className="h-8 w-8"
                disabled={!newMessage.trim() || isUploading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
