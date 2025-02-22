
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { ChannelMemberManagement } from "./ChannelMemberManagement";
import { PlusCircle, Settings } from "lucide-react";
import { MentionSuggestions } from "@/components/chat/MentionSuggestions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  id: string;
  content: string;
  created_at: string;
  channel_id: string;
  sender_id: string;
  sender?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
}

interface MemberSuggestion {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'interpreter';
}

interface LanguageSuggestion {
  name: string;
  type: 'language';
}

type Suggestion = MemberSuggestion | LanguageSuggestion;

export const MessagesTab = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionStartRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_channels')
          .select('*')
          .order('name');

        if (error) throw error;
        setChannels(data);
        
        // Select the first channel by default if none is selected
        if (data.length > 0 && !selectedChannel) {
          setSelectedChannel(data[0]);
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
        toast({
          title: "Error",
          description: "Failed to fetch channels",
          variant: "destructive",
        });
      }
    };

    fetchChannels();
  }, [selectedChannel]);

  // Subscribe to messages and member changes for the selected channel
  useEffect(() => {
    if (!selectedChannel) return;

    const messagesChannel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "chat_messages",
          filter: `channel_id=eq.${selectedChannel.id}`
        },
        () => {
          fetchMessages(selectedChannel.id);
        }
      )
      .subscribe();

    const membersChannel = supabase
      .channel("channel_members")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_members",
          filter: `channel_id=eq.${selectedChannel.id}`
        },
        () => {
          // Refresh messages to update any UI elements that depend on member status
          fetchMessages(selectedChannel.id);
        }
      )
      .subscribe();

    fetchMessages(selectedChannel.id);

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(membersChannel);
    };
  }, [selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async (channelId: string) => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq('channel_id', channelId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Fetch sender details for each message
      const messagesWithSenders = await Promise.all(
        (messagesData || []).map(async (message) => {
          const { data: senderData, error: senderError } = await supabase
            .rpc('get_message_sender_details', {
              sender_id: message.sender_id
            });

          if (senderError) {
            console.error("Error fetching sender:", senderError);
            return message;
          }

          const sender = senderData?.[0];
          return {
            ...message,
            sender: sender ? {
              id: sender.id,
              name: sender.name,
              avatarUrl: sender.avatar_url
            } : undefined
          };
        })
      );

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive",
      });
    }
  };

  const fetchMentionSuggestions = async (query: string) => {
    if (!selectedChannel) return;

    try {
      // Fetch channel members
      const { data: memberData } = await supabase
        .rpc('get_channel_members', { channel_id: selectedChannel.id });

      const memberSuggestions = (memberData || [])
        .filter(member => 
          member.first_name.toLowerCase().includes(query.toLowerCase()) ||
          member.last_name.toLowerCase().includes(query.toLowerCase()))
        .map(member => ({
          id: member.user_id,
          name: `${member.first_name} ${member.last_name}`,
          email: member.email,
          role: member.role
        }));

      // Fetch available languages in the channel
      const { data: languageData } = await supabase
        .rpc('get_channel_target_languages', { channel_id: selectedChannel.id });

      const languageSuggestions = (languageData || [])
        .filter(lang => lang.target_language.toLowerCase().includes(query.toLowerCase()))
        .map(lang => ({
          name: lang.target_language,
          type: 'language' as const
        }));

      setSuggestions([...memberSuggestions, ...languageSuggestions]);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const handleMentionSelect = (suggestion: Suggestion) => {
    if (!inputRef.current) return;

    const beforeMention = newMessage.substring(0, mentionStartRef.current);
    const afterMention = newMessage.substring(inputRef.current.selectionStart);
    const mentionText = 'type' in suggestion ? suggestion.name : suggestion.name;

    setNewMessage(`${beforeMention}@${mentionText} ${afterMention}`);
    setShowMentions(false);

    // Focus back on input
    inputRef.current.focus();
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Check for mention triggers
    const lastAtSymbol = value.lastIndexOf('@');
    if (lastAtSymbol !== -1 && lastAtSymbol >= value.lastIndexOf(' ')) {
      const query = value.slice(lastAtSymbol + 1);
      mentionStartRef.current = lastAtSymbol;
      fetchMentionSuggestions(query);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChannel) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("chat_messages")
        .insert([{ 
          content: newMessage,
          channel_id: selectedChannel.id,
          sender_id: user.id
        }]);

      if (error) throw error;
      setNewMessage("");
      setShowMentions(false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleChannelCreated = () => {
    const fetchChannels = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_channels')
          .select('*')
          .order('name');

        if (error) throw error;
        setChannels(data);
      } catch (error) {
        console.error("Error fetching channels:", error);
      }
    };
    fetchChannels();
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Channels List */}
      <div className="w-64 flex flex-col border-r pr-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Channels</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCreateDialog(true)}
            className="h-8 w-8"
          >
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-accent ${
                selectedChannel?.id === channel.id ? 'bg-accent' : ''
              }`}
              onClick={() => setSelectedChannel(channel)}
            >
              <span className="truncate">{channel.name}</span>
              {selectedChannel?.id === channel.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMemberManagement(true);
                  }}
                  className="h-8 w-8"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              {messages.map((message) => (
                <Card key={message.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      {message.sender?.avatarUrl && (
                        <AvatarImage src={message.sender.avatarUrl} />
                      )}
                      <AvatarFallback>
                        {message.sender?.name.substring(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{message.sender?.name || 'Unknown User'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), "PPpp", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <p className="ml-10">{message.content}</p>
                </Card>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="relative">
              <form onSubmit={sendMessage} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={handleInput}
                  placeholder={`Message #${selectedChannel.name}`}
                  className="flex-1"
                />
                <Button type="submit">Send</Button>
              </form>
              {showMentions && suggestions.length > 0 && (
                <div className="absolute bottom-full mb-1">
                  <MentionSuggestions
                    suggestions={suggestions}
                    onSelect={handleMentionSelect}
                    visible={showMentions}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a channel to start messaging
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateChannelDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onChannelCreated={handleChannelCreated}
      />

      {selectedChannel && (
        <ChannelMemberManagement
          isOpen={showMemberManagement}
          onClose={() => setShowMemberManagement(false)}
          channelId={selectedChannel.id}
        />
      )}
    </div>
  );
};
