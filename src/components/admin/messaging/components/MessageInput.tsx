import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Paperclip } from "lucide-react";
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
      
      // Reset file input
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
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tapez votre message..."
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            handleSend();
          }
        }}
      />
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      <Button onClick={handleSend} disabled={isUploading}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};