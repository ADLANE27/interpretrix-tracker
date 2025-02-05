import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { X, Paperclip, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChannelMember } from "@/types/messaging";

interface ChatInputProps {
  onSendMessage: (content: string, parentMessageId?: string, attachments?: Array<{
    url: string;
    filename: string;
    type: string;
    size: number;
  }>) => Promise<string>;
  isLoading?: boolean;
  replyTo?: {
    id: string;
    content: string;
    sender: {
      name: string;
    };
  };
  onCancelReply?: () => void;
  channelId: string;
  currentUserId: string | null;
}

export const ChatInput = ({
  onSendMessage,
  isLoading,
  replyTo,
  onCancelReply,
  channelId,
  currentUserId
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [isMentioning, setIsMentioning] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachments, setAttachments] = useState<Array<{
    url: string;
    filename: string;
    type: string;
    size: number;
  }>>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: channelMembers = [] } = useQuery<ChannelMember[]>({
    queryKey: ['channelMembers', channelId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_channel_members', {
        channel_id: channelId
      });
      
      if (error) throw error;
      console.log('Channel members:', data);
      return data;
    },
    enabled: !!channelId
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '@') {
      setIsMentioning(true);
      setCursorPosition(e.currentTarget.selectionStart || 0);
      setMentionQuery('');
    }
  };

  const filteredMembers = channelMembers.filter(member => {
    const searchTerm = mentionQuery.toLowerCase();
    return (
      member.first_name.toLowerCase().includes(searchTerm) ||
      member.last_name.toLowerCase().includes(searchTerm) ||
      member.email.toLowerCase().includes(searchTerm)
    );
  });

  const handleMentionSelect = (member: ChannelMember) => {
    if (!textareaRef.current) return;

    const beforeMention = message.slice(0, cursorPosition);
    const afterMention = message.slice(cursorPosition + 1); // Add +1 to skip the @ symbol
    const mentionText = `@${member.first_name} ${member.last_name}`;
    
    setMessage(`${beforeMention}${mentionText} ${afterMention}`);
    setIsMentioning(false);
    textareaRef.current.focus();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await supabase.functions.invoke('upload-chat-attachment', {
          body: formData,
        });

        if (response.error) throw response.error;
        return response.data;
      } catch (error) {
        console.error('File upload error:', error);
        toast({
          title: "Upload Error",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
        return null;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const validAttachments = results.filter(Boolean);
      setAttachments(prev => [...prev, ...validAttachments]);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && attachments.length === 0) || isLoading || uploadingFiles || !currentUserId) return;

    try {
      await onSendMessage(message, replyTo?.id, attachments);
      setMessage("");
      setAttachments([]);
      if (replyTo && onCancelReply) {
        onCancelReply();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      {replyTo && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
          <span>Replying to {replyTo.sender.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={onCancelReply}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
              <span className="text-sm truncate max-w-[200px]">{file.filename}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === '@') {
              setIsMentioning(true);
              setCursorPosition(e.currentTarget.selectionStart || 0);
              setMentionQuery('');
            }
          }}
          placeholder="Type your message..."
          className="min-h-[100px] resize-none pr-10"
        />
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 bottom-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFiles}
        >
          {uploadingFiles ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>
        
        {isMentioning && (
          <div className="absolute bottom-full left-0 w-[200px] mb-2">
            <Command>
              <CommandInput 
                placeholder="Search members..." 
                value={mentionQuery}
                onValueChange={setMentionQuery}
              />
              <CommandList>
                {filteredMembers.length === 0 ? (
                  <CommandEmpty>No members found.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredMembers.map((member) => (
                      <CommandItem
                        key={member.user_id}
                        value={`${member.first_name} ${member.last_name}`}
                        onSelect={() => handleMentionSelect(member)}
                      >
                        {member.first_name} {member.last_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={(!message.trim() && attachments.length === 0) || isLoading || uploadingFiles}
          className={cn(
            "transition-all",
            (isLoading || uploadingFiles) && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading || uploadingFiles ? "Sending..." : "Send"}
        </Button>
      </div>
    </form>
  );
};
