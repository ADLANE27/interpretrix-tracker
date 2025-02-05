import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, X, Paperclip, Smile, Loader2, AtSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";

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
  channelId: string;
  currentUserId: string | null; // Add this prop
}

interface ChannelMember {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

const EMOJI_LIST = ["😊", "😂", "😍", "👍", "❤️", "😎", "🎉", "✨", "🔥", "👋", "😅", "🙌", "👏", "🤔", "😮", "🎈", "🌟", "💪", "🤝", "👌"];

export const ChatInput = ({ 
  onSendMessage, 
  isLoading = false,
  replyTo,
  onCancelReply,
  channelId,
  currentUserId // Add this to destructuring
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([]);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchChannelMembers = async () => {
      const { data, error } = await supabase
        .rpc('get_channel_members', { channel_id: channelId });
      
      if (error) {
        console.error('Error fetching channel members:', error);
        return;
      }
      
      setChannelMembers(data);
    };

    fetchChannelMembers();
  }, [channelId]);

  const extractMentions = (content: string) => {
    const mentionRegex = /@([A-Za-z\s]+)/g;
    const matches = [...content.matchAll(mentionRegex)];
    return matches.map(match => match[1].trim());
  };

  const createMentions = async (messageId: string, content: string) => {
    const mentionedNames = extractMentions(content);
    
    if (mentionedNames.length === 0) return;

    const mentionedUsers = channelMembers.filter(member => 
      mentionedNames.some(name => 
        `${member.first_name} ${member.last_name}` === name
      )
    );

    for (const user of mentionedUsers) {
      try {
        const { error } = await supabase
          .from('message_mentions')
          .insert({
            message_id: messageId,
            mentioned_user_id: user.user_id,
            mentioning_user_id: currentUserId,
            channel_id: channelId,
            status: 'unread'
          });

        if (error) {
          console.error('Error creating mention:', error);
          toast({
            title: "Error",
            description: "Failed to create mention",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error creating mention:', error);
      }
    }
  };

  const handleMentionSelect = (member: ChannelMember) => {
    if (mentionStartIndex === null) return;

    const beforeMention = message.substring(0, mentionStartIndex);
    const afterMention = message.substring(cursorPosition);
    const memberName = `${member.first_name} ${member.last_name}`;
    const newMessage = `${beforeMention}@${memberName}${afterMention}`;
    
    setMessage(newMessage);
    setShowMentions(false);
    setMentionStartIndex(null);
    
    if (textareaRef.current) {
      const newCursorPos = mentionStartIndex + memberName.length + 1;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }

    if (showMentions) {
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);

    // Check for @ symbol
    const lastAtSymbol = newValue.lastIndexOf('@', cursorPos);
    if (lastAtSymbol !== -1) {
      const textAfterAt = newValue.slice(lastAtSymbol + 1, cursorPos);
      const hasSpaceAfterAt = /\s/.test(textAfterAt);
      
      if (!hasSpaceAfterAt) {
        setMentionStartIndex(lastAtSymbol);
        setMentionSearch(textAfterAt);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    setMessage(newValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || attachments.length > 0) {
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          content: message.trim(),
          parent_message_id: replyTo?.id,
          sender_id: currentUserId,
          attachments
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error sending message:', messageError);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
        return;
      }

      if (messageData) {
        await createMentions(messageData.id, message);
        onSendMessage(message.trim(), replyTo?.id, attachments);
        setMessage("");
        setAttachments([]);
      }
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

  const filteredMembers = channelMembers.filter(member => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
    return fullName.includes(mentionSearch.toLowerCase());
  });

  return (
    <div className="border-t bg-gradient-to-b from-background/95 to-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200">
      {replyTo && (
        <div className="px-4 py-2 bg-muted/30 backdrop-blur-sm border-b flex items-center justify-between animate-fade-in">
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
            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-muted/20 backdrop-blur-sm flex flex-wrap gap-2 border-b animate-fade-in">
          {attachments.map((attachment, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 bg-background/80 backdrop-blur rounded-lg px-3 py-1.5 text-sm border shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <span className="truncate max-w-[200px]">{attachment.filename}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
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
              className="h-9 w-9 flex-shrink-0 hover:bg-muted/50 transition-colors duration-200"
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
                  className="h-9 w-9 flex-shrink-0 hover:bg-muted/50 transition-colors duration-200"
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
                      className="h-8 w-8 p-0 hover:bg-muted transition-colors duration-200"
                      onClick={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Write your message... Use @ to mention someone"
              className={cn(
                "min-h-[44px] max-h-[200px] resize-none bg-muted/30 focus:bg-background transition-colors duration-200 rounded-xl",
                replyTo && "rounded-t-none"
              )}
            />
            {showMentions && filteredMembers.length > 0 && (
              <div className="absolute bottom-full mb-1 w-64 bg-popover text-popover-foreground shadow-md rounded-lg border overflow-hidden">
                <Command className="max-h-[200px] overflow-y-auto">
                  <CommandGroup heading="Mentions">
                    {filteredMembers.map((member) => (
                      <CommandItem
                        key={member.user_id}
                        onSelect={() => handleMentionSelect(member)}
                        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/50"
                      >
                        <AtSign className="h-4 w-4 text-muted-foreground" />
                        <span>{member.first_name} {member.last_name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </div>
            )}
          </div>
        </div>
        <Button 
          type="submit" 
          disabled={(!message.trim() && attachments.length === 0) || isLoading || uploadingFiles}
          className={cn(
            "px-4 h-9 flex-shrink-0 rounded-xl transition-all duration-200",
            message.trim() || attachments.length > 0 ? 
              "bg-primary hover:bg-primary/90" : 
              "bg-secondary hover:bg-secondary/90"
          )}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};
