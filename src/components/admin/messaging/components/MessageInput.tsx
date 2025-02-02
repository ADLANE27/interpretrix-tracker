import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (attachmentUrl?: string, attachmentName?: string) => void;
}

export const MessageInput = ({ value, onChange, onSend }: MessageInputProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('message_attachments')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('message_attachments')
        .getPublicUrl(fileName);

      onSend(publicUrl, file.name);
      
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
    onSend();
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
            if (e.key === "Enter") {
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
            disabled={isUploading}
          >
            <Paperclip className="h-4 w-4 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-chat-hover"
          >
            <Smile className="h-4 w-4 text-gray-500" />
          </Button>
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
        disabled={isUploading}
        size="icon"
        className="bg-chat-selected hover:bg-chat-selected/90 h-10 w-10"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};