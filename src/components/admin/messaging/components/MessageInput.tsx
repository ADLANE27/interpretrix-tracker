import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string, file?: File) => void;
  isLoading?: boolean;
}

export const MessageInput = ({ value, onChange, onSend, isLoading }: MessageInputProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSend = () => {
    if (value.trim()) {
      onSend(value);
      onChange("");
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    onChange(value + emojiData.emoji);
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1 relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your message..."
          className="w-full bg-chat-input border-chat-divider pl-4 pr-20 py-2 focus-visible:ring-chat-selected"
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-chat-hover"
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
                className="h-8 w-8 hover:bg-chat-hover"
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
        size="icon"
        className="bg-chat-selected hover:bg-chat-selected/90 h-10 w-10"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};