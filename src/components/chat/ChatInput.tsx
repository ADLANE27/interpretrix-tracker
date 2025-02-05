import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChatInputProps {
  onSendMessage: (content: string, parentMessageId?: string) => Promise<string>; // Updated return type
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: channelMembers = [] } = useQuery({
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

  const handleMentionSelect = async (member: ChannelMember) => {
    if (!textareaRef.current) return;

    const beforeMention = message.slice(0, cursorPosition);
    const afterMention = message.slice(cursorPosition + 1);
    const mentionText = `@${member.first_name} ${member.last_name}`;
    
    setMessage(`${beforeMention}${mentionText} ${afterMention}`);
    setIsMentioning(false);
    textareaRef.current.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    try {
      // Send the message and get the message ID
      const messageId = await onSendMessage(message, replyTo?.id);

      // Only proceed with mentions if we have a message ID
      if (messageId) {
        const mentionRegex = /@(\w+\s\w+)/g;
        const mentions = message.match(mentionRegex);

        if (mentions && currentUserId) {
          const { data: channelMembers } = await supabase.rpc('get_channel_members', {
            channel_id: channelId
          });

          for (const mention of mentions) {
            const memberName = mention.slice(1);
            const mentionedMember = channelMembers?.find(
              member => `${member.first_name} ${member.last_name}` === memberName
            );

            if (mentionedMember) {
              await supabase
                .from('message_mentions')
                .insert({
                  message_id: messageId,
                  channel_id: channelId,
                  mentioned_user_id: mentionedMember.user_id,
                  mentioning_user_id: currentUserId,
                  status: 'unread'
                });
            }
          }
        }
      }

      setMessage("");
      if (replyTo && onCancelReply) {
        onCancelReply();
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
