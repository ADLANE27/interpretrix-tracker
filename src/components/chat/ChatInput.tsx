
import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Message } from "@/types/messaging";
import { Paperclip, Send, Smile } from 'lucide-react';
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
    <div className="border-t bg-background">
      {replyTo && (
        <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground border-b">
          <span className="truncate">En réponse à : {replyTo.sender.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyTo(null)}
            className="shrink-0 h-6 px-2 text-xs"
          >
            Annuler
          </Button>
        </div>
      )}
      <div className="p-2 sm:p-3">
        <div className="relative flex flex-col gap-2">
          <div className="flex items-end gap-2 bg-background rounded-lg border shadow-sm focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500">
            <Textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrivez un message..."
              className="min-h-[44px] max-h-[120px] py-3 px-4 border-0 focus-visible:ring-0 resize-none shadow-none"
              onKeyDown={handleKeyDown}
            />
            <div className="flex items-center gap-1 p-2 shrink-0">
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
                onClick={onSendMessage}
                disabled={!message.trim() && attachments.length === 0}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-1">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm py-1 px-2 bg-gray-50 rounded">
                  <span className="text-gray-700 truncate flex-1">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 hover:text-red-500 shrink-0"
                    onClick={() => handleRemoveAttachment(index)}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
