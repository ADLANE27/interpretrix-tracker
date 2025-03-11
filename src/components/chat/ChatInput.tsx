import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Message } from "@/types/messaging";
import { Paperclip, Send, Smile, X } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from "@/components/ui/textarea";

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

  const handleEmojiSelect = (emoji: any) => {
    setMessage(message + emoji.native);
    setEmojiPickerOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() || attachments.length > 0) {
        onSendMessage();
      }
    }
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t shadow-lg pb-4">
      {replyTo && (
        <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Replying to {replyTo.sender.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyTo(null)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="max-w-[1200px] mx-auto px-4 py-2">
        <div className="flex items-end gap-2 bg-background rounded-lg border shadow-sm focus-within:ring-1 focus-within:ring-interpreter-navy focus-within:border-interpreter-navy">
          <div className="flex-1 min-h-[44px] flex items-end">
            <Textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message..."
              className="resize-none border-0 focus-visible:ring-0 px-3 py-3 min-h-[44px] text-base bg-transparent"
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex items-center gap-1 p-1">
            <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-interpreter-navy"
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
              className="h-8 w-8 text-muted-foreground hover:text-interpreter-navy"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-8 w-8 bg-interpreter-navy hover:bg-interpreter-navy/90 text-white"
              onClick={onSendMessage}
              disabled={!message.trim() && attachments.length === 0}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-2 text-sm py-1 px-2 bg-muted/50 rounded">
                <span className="text-muted-foreground truncate flex-1">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 hover:text-red-500 p-0"
                  onClick={() => handleRemoveAttachment(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
