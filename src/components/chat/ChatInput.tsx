
import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Send, PaperclipIcon, X, Smile, WifiOff } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Message } from '@/types/messaging';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Badge } from "@/components/ui/badge";

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
  isDisabled?: boolean;
  connectionStatus?: 'online' | 'offline';
  uploadProgress?: Record<string, number>;
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
  isDisabled = false,
  connectionStatus = 'online',
  uploadProgress = {}
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    setMessage(e.target.value);
  };

  const insertEmoji = (emoji: { native: string }) => {
    // Fixed: Using the setter function correctly
    setMessage((prev: string) => prev + emoji.native);
    setIsEmojiPickerOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="border-t p-3">
      {replyTo && (
        <div className="flex items-center justify-between p-2 mb-2 bg-gray-50 rounded-md">
          <div className="flex items-center">
            <div className="w-1 h-10 bg-blue-500 rounded-full mr-2"></div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-blue-600">
                Reply to {replyTo.sender.name}
              </span>
              <span className="text-xs text-gray-500 truncate max-w-[250px]">
                {replyTo.content}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setReplyTo(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((file, index) => {
            const isUploading = Object.keys(uploadProgress).some(key => 
              key.includes(file.name) && uploadProgress[key] < 100
            );
            
            // Fixed: Getting the progress value correctly
            const progressKey = Object.keys(uploadProgress).find(key => key.includes(file.name));
            const progress = progressKey ? uploadProgress[progressKey] : 0;
              
            return (
              <div 
                key={index} 
                className={cn(
                  "flex items-center gap-1 bg-gray-100 rounded-full py-1 pl-3 pr-1",
                  "text-xs relative overflow-hidden"
                )}
              >
                {isUploading && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-emerald-100 z-0"
                    style={{ width: `${progress}%` }}
                  />
                )}
                <span className="truncate max-w-[120px] z-10">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full z-10"
                  onClick={() => handleRemoveAttachment(index)}
                  disabled={isUploading}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={autoResizeTextarea}
            onKeyDown={handleKeyDown}
            placeholder={connectionStatus === 'offline' ? "Messages will be sent when you're back online..." : "Écrivez un message..."}
            className={cn(
              "flex w-full rounded-md border p-3 pr-12 text-sm",
              "focus-visible:outline-none focus-visible:ring-1", 
              "focus-visible:ring-ring placeholder:text-muted-foreground resize-none min-h-[44px] max-h-[200px]",
              connectionStatus === 'offline' && "bg-gray-50 text-muted-foreground"
            )}
            disabled={isDisabled}
          />
          
          <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
            <input
              type="file"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
              multiple
              disabled={isDisabled || connectionStatus === 'offline'}
            />
            
            <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-transparent hover:bg-gray-100"
                  disabled={isDisabled}
                >
                  <Smile className="h-5 w-5 text-gray-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="p-0">
                <Picker data={data} onEmojiSelect={insertEmoji} />
              </PopoverContent>
            </Popover>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-transparent hover:bg-gray-100"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled || connectionStatus === 'offline'}
            >
              <PaperclipIcon className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </div>
        
        <Button
          className={cn(
            "rounded-full h-10 w-10 p-0 flex-shrink-0",
            connectionStatus === 'offline' && "bg-amber-500 hover:bg-amber-600"
          )}
          onClick={onSendMessage}
          disabled={(!message.trim() && attachments.length === 0) || isDisabled}
        >
          {connectionStatus === 'offline' ? (
            <WifiOff className="h-5 w-5" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
      
      {connectionStatus === 'offline' && (
        <div className="mt-2 text-xs text-amber-600 flex items-center gap-1.5 justify-center">
          <WifiOff className="h-3 w-3" />
          <span>You're currently offline. Messages will be sent when connection is restored.</span>
        </div>
      )}
    </div>
  );
};
