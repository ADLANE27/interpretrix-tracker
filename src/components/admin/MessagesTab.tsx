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
import { PlusCircle, Settings, Paperclip, Send, Smile, Trash2 } from "lucide-react";
import { MentionSuggestions } from "@/components/chat/MentionSuggestions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageAttachment } from "@/components/chat/MessageAttachment";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react";

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
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionStartRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_channels')
          .select('*')
          .order('name');

        if (error) throw error;
        setChannels(data);
        
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

    inputRef.current.focus();
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

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

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage(prev => prev + emoji.native);
  };

  const deleteMessage = async (messageId: string, senderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (user.id !== senderId) {
        toast({
          title: "Erreur",
          description: "Vous ne pouvez pas supprimer les messages des autres utilisateurs",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Message supprimé",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Erreur",
        description: "Échec de la suppression du message",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedChannel) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase.storage.createBucket('chat-attachments', {
        public: true,
        fileSizeLimit: 52428800,
        allowedMimeTypes: ['application/pdf', 'image/*', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      });

      const fileName = `${Date.now()}-${file.name}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('chat-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          duplex: 'half'
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      const { data: publicUrlData } = supabase
        .storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      if (!publicUrlData.publicUrl) {
        throw new Error("Failed to generate public URL");
      }

      const messageContent = JSON.stringify({
        type: 'attachment',
        file: {
          name: file.name,
          url: publicUrlData.publicUrl,
          size: file.size,
          mimeType: file.type
        }
      });

      const { error: messageError } = await supabase
        .from("chat_messages")
        .insert([{
          content: messageContent,
          channel_id: selectedChannel.id,
          sender_id: user.id,
        }]);

      if (messageError) {
        console.error("Message error:", messageError);
        throw messageError;
      }

      toast({
        title: "Succès",
        description: "Fichier téléchargé avec succès",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erreur",
        description: "Échec du téléchargement du fichier",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  const renderMessageContent = (content: string) => {
    try {
      const data = JSON.parse(content);
      if (data.type === 'attachment' && data.file) {
        return <MessageAttachment url={data.file.url} filename={data.file.name} />;
      }
    } catch (e) {
      return <p className="ml-10">{content}</p>;
    }
    return <p className="ml-10">{content}</p>;
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      <div className="w-64 flex flex-col border-r pr-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Canaux</h3>
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

      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              {messages.map((message) => (
                <Card key={message.id} className="p-4 group relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
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
                    {message.sender?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMessage(message.id, message.sender_id)}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {renderMessageContent(message.content)}
                </Card>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="relative">
              <form onSubmit={sendMessage} className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-background rounded-lg border">
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={handleInput}
                    placeholder={`Message #${selectedChannel.name}`}
                    className="flex-1 border-0"
                  />
                  <div className="flex items-center gap-1 px-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Smile className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0"
                        side="top"
                        align="end"
                      >
                        <Picker
                          data={data}
                          onEmojiSelect={handleEmojiSelect}
                          locale="fr"
                        />
                      </PopoverContent>
                    </Popover>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? "..." : "Envoyer"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
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
            Sélectionnez un canal pour commencer à envoyer des messages
          </div>
        )}
      </div>

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
