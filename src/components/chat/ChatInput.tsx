import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, X, Paperclip, Smile, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ChatInputProps {
  onSendMessage: (content: string, parentMessageId?: string, attachments?: any[]) => void;
  isLoading?: boolean;
  replyTo?: {
    id: string;
    content: string;
    sender: {
      name: string;
    };
  };
  onCancelReply?: () => void;
}

const EMOJI_LIST = ["😊", "😂", "😍", "👍", "❤️", "😎", "🎉", "✨", "🔥", "👋", "😅", "🙌", "👏", "🤔", "😮", "🎈", "🌟", "💪", "🤝", "👌"];

export const ChatInput = ({ 
  onSendMessage, 
  isLoading = false,
  replyTo,
  onCancelReply
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message.trim(), replyTo?.id, attachments);
      setMessage("");
      setAttachments([]);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.substring(0, start) + emoji + message.substring(end);
      setMessage(newMessage);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setMessage(message + emoji);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const uploadedAttachments = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from('message_attachments')
          .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('message_attachments')
          .getPublicUrl(filePath);

        uploadedAttachments.push({
          url: publicUrl,
          filename: file.name,
          type: file.type,
          size: file.size
        });
      }

      setAttachments(prev => [...prev, ...uploadedAttachments]);
      toast({
        title: "Fichiers téléchargés",
        description: `${files.length} fichier(s) ajouté(s) au message`
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger les fichiers",
        variant: "destructive"
      });
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {replyTo && (
        <div className="px-4 py-2 bg-muted/30 backdrop-blur-sm border-b flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              Replying to {replyTo.sender.name}
            </span>
            <span className="text-sm truncate max-w-[300px]">{replyTo.content}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancelReply}
            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-muted/20 backdrop-blur-sm flex flex-wrap gap-2 border-b">
          {attachments.map((attachment, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 bg-background/80 backdrop-blur rounded-md px-2 py-1 text-sm border shadow-sm"
            >
              <span className="truncate max-w-[200px]">{attachment.filename}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4">
        <div className="flex-1 flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleFileSelect}
              className="h-9 w-9 flex-shrink-0 hover:bg-muted/50"
              disabled={uploadingFiles}
            >
              {uploadingFiles ? (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              ) : (
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0 hover:bg-muted/50"
                >
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-2">
                <div className="grid grid-cols-10 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-muted"
                      onClick={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message..."
            className={cn(
              "min-h-[44px] max-h-[200px] resize-none bg-muted/30 focus:bg-background transition-colors",
              replyTo && "rounded-t-none"
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>
        <Button 
          type="submit" 
          disabled={(!message.trim() && attachments.length === 0) || isLoading || uploadingFiles}
          className="px-4 h-9 flex-shrink-0"
          variant={message.trim() || attachments.length > 0 ? "default" : "secondary"}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};