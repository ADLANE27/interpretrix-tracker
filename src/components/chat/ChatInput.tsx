import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChatInputProps {
  onSendMessage: (content: string, parentMessageId?: string) => void;
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

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface ChannelMember {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "interpreter";
  joined_at: string;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: channelMembers = [] } = useQuery<ChannelMember[]>({
    queryKey: ['channelMembers', channelId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_channel_members', {
        channel_id: channelId
      });
      
      if (error) throw error;
      console.log('Channel members:', data); // Debug log
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
    const afterMention = message.slice(cursorPosition);
    const mentionText = `@${member.first_name} ${member.last_name}`;
    
    setMessage(`${beforeMention}${mentionText} ${afterMention}`);
    setIsMentioning(false);
    textareaRef.current.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    onSendMessage(message, replyTo?.id);
    setMessage("");
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
      
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="min-h-[100px] resize-none"
        />
        
        {isMentioning && (
          <Popover open={true} onOpenChange={setIsMentioning}>
            <PopoverTrigger asChild>
              <div />
            </PopoverTrigger>
            <PopoverContent 
              className="p-0 w-[200px]" 
              align="start"
              side="top"
            >
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
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={!message.trim() || isLoading}
          className={cn(
            "transition-all",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          Send
        </Button>
      </div>
    </form>
  );
};