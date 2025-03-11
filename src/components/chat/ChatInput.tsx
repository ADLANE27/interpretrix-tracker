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
    <div className="w-full">
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/30">
          <span className="truncate">En réponse à : {replyTo.sender.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyTo(null)}
            className="ml-auto h-6 px-2 text-xs"
          >
            Annuler
          </Button>
        </div>
      )}
      <div className="p-2">
        <div className="relative flex flex-col gap-2">
          <div className="flex items-end gap-2 rounded-xl border bg-white dark:bg-gray-800/90 shadow-sm">
            <Textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrivez un message..."
              className="min-h-[44px] max-h-[120px] py-3 px-4 bg-transparent focus-visible:ring-0 resize-none shadow-none rounded-xl"
              onKeyDown={handleKeyDown}
            />
            <div className="flex items-center gap-1 p-2 shrink-0">
              <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-auto p-0" 
                  side="top" 
                  align="end"
                  sideOffset={15}
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
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                className="h-8 w-8 bg-purple-500 hover:bg-purple-600 text-white"
                onClick={onSendMessage}
                disabled={!message.trim() && attachments.length === 0}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-1 mt-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm py-1 px-2 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground truncate flex-1">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 hover:text-destructive shrink-0"
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
