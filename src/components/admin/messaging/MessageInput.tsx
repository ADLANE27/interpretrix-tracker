import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, AtSign } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
import type { User } from "@/types/messaging";

interface MessageInputProps {
  channelId: string;
}

export const MessageInput = ({ channelId }: MessageInputProps) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [channelUsers, setChannelUsers] = useState<User[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchChannelUsers = async () => {
      const { data: memberData, error: memberError } = await supabase
        .from('channel_members')
        .select('user_id')
        .eq('channel_id', channelId);

      if (memberError) {
        console.error('Error fetching channel members:', memberError);
        return;
      }

      const userIds = memberData.map(member => member.user_id);

      const { data: userData, error: userError } = await supabase
        .from('interpreter_profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      if (userError) {
        console.error('Error fetching users:', userError);
        return;
      }

      const formattedUsers = userData.map(user => ({
        id: user.id,
        email: user.email,
        raw_user_meta_data: {
          first_name: user.first_name,
          last_name: user.last_name
        }
      }));

      setChannelUsers(formattedUsers);
    };

    fetchChannelUsers();
  }, [channelId]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentions = Array.from(content.matchAll(mentionRegex));
      
      const { data: message, error: messageError } = await supabase
        .from("messages")
        .insert({
          channel_id: channelId,
          content: content.trim(),
          sender_id: user.id,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      if (mentions.length > 0 && message) {
        const mentionInserts = mentions.map(match => ({
          message_id: message.id,
          mentioned_user_id: match[2],
        }));

        const { error: mentionError } = await supabase
          .from("message_mentions")
          .insert(mentionInserts);

        if (mentionError) console.error("Error inserting mentions:", mentionError);
      }

      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "@") {
      setShowMentions(true);
    }
  };

  const insertMention = (user: User) => {
    const mention = `@[${user.raw_user_meta_data.first_name} ${user.raw_user_meta_data.last_name}](${user.id})`;
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const newContent = content.slice(0, cursorPos) + mention + content.slice(cursorPos);
    setContent(newContent);
    setShowMentions(false);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  return (
    <div className="flex items-end gap-2 p-4 border-t relative">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message... Use @ to mention someone"
        className="min-h-[60px] resize-none"
        rows={1}
      />
      <Popover open={showMentions} onOpenChange={setShowMentions}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="flex-shrink-0"
            onClick={() => setShowMentions(true)}
          >
            <AtSign className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search users..."
              value={mentionSearch}
              onValueChange={setMentionSearch}
            />
            <CommandList>
              {channelUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  onSelect={() => insertMention(user)}
                  className="cursor-pointer"
                >
                  {user.raw_user_meta_data.first_name} {user.raw_user_meta_data.last_name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button
        type="submit"
        size="icon"
        onClick={handleSubmit}
        disabled={isSubmitting || !content.trim()}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};