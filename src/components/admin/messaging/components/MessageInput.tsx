import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSendMessage: (content: string) => void;
  onFileUpload?: (file: File) => void;
  isUploading?: boolean;
  onMention?: (mentionData: { type: "user" | "language"; value: string }) => void;
}

export const MessageInput = ({
  value,
  onChange,
  onSendMessage,
  onFileUpload,
  isUploading = false,
  onMention
}: MessageInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (value.trim()) {
      onSendMessage(value);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    onChange(value + emojiData.emoji);
  };

  return (
    <div className="p-4 border-t">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Tapez votre message..."
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {onFileUpload && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-100"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Paperclip className="h-4 w-4 text-gray-500" />
              </Button>
            )}
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
        {onFileUpload && (
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onFileUpload) {
                onFileUpload(file);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }
            }}
          />
        )}
        <Button 
          onClick={handleSend}
          disabled={isUploading || !value.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};