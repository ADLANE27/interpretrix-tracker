import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { NewDirectMessageDialog } from "./NewDirectMessageDialog";
import { ChannelMemberManagement } from "./ChannelMemberManagement";
import { Message } from "@/types/messaging";
import { PlusCircle, Settings, Paperclip, Send, Smile, Trash2, MessageSquare, UserPlus, ChevronDown, ChevronRight, ChevronLeft, Pencil } from 'lucide-react';
import { MentionSuggestions } from "@/components/chat/MentionSuggestions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageAttachment } from "@/components/chat/MessageAttachment";
import { useIsMobile } from "@/hooks/use-mobile";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Channel {
  id: string;
  display_name: string;
  description: string | null;
  channel_type: string;
  created_at: string;
  updated_at: string;
  created_by: string;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDirectMessageDialog, setShowDirectMessageDialog] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [showChannelList, setShowChannelList] = useState(true);
  const [editingChannel, setEditingChannel] = useState<{id: string, name: string} | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionStartRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .rpc('get_channels_with_display_names', {
            current_user_id: user.id
          }) as { data: Channel[] | null; error: any };

        if (error) throw error;
        if (data) {
          setChannels(data);
          if (data.length > 0 && !selectedChannel) {
            setSelectedChannel(data[0]);
          }
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
    scrollToBottom();
  }, [messages]);

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

      const messageData: any = {
        content: newMessage,
        channel_id: selectedChannel.id,
        sender_id: user.id,
      };

      if (replyTo) {
        messageData.parent_message_id = replyTo.id;
      }

      const { error } = await supabase
        .from("chat_messages")
        .insert([messageData]);

      if (error) throw error;
      setNewMessage("");
      setReplyTo(null);
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .rpc('get_channels_with_display_names', {
            current_user_id: user.id
          }) as { data: Channel[] | null; error: any };

        if (error) throw error;
        if (data) {
          setChannels(data);
        }
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

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;

    try {
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('channel_id', channelToDelete.id);

      if (messagesError) throw messagesError;

      const { error: membersError } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelToDelete.id);

      if (membersError) throw membersError;

      const { error: channelError } = await supabase
        .from('chat_channels')
        .delete()
        .eq('id', channelToDelete.id);

      if (channelError) throw channelError;

      setChannels(channels.filter(c => c.id !== channelToDelete.id));
      if (selectedChannel?.id === channelToDelete.id) {
        setSelectedChannel(null);
      }

      toast({
        title: "Succès",
        description: "Le canal a été supprimé",
      });
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast({
        title: "Erreur",
        description: "Échec de la suppression du canal",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setChannelToDelete(null);
    }
  };

  const toggleThread = (messageId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const messageThreads = messages.reduce((acc: { [key: string]: Message[] }, message) => {
    const threadId = message.parent_message_id || message.id;
    if (!acc[threadId]) {
      acc[threadId] = [];
    }
    acc[threadId].push(message);
    return acc;
  }, {});

  const rootMessages = messages.filter(message => !message.parent_message_id);

  const handleRename = async (channelId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('chat_channels')
        .update({ name: newName.trim() })
        .eq('id', channelId);

      if (error) throw error;

      setEditingChannel(null);
      
      toast({
        title: "Success",
        description: "Channel renamed successfully"
      });
    } catch (error) {
      console.error('Error renaming channel:', error);
      toast({
        title: "Error",
        description: "Failed to rename channel",
        variant: "destructive"
      });
    }
  };

  const getAvatarColor = (userId: string) => {
    const colors = [
      'bg-purple-100 text-purple-600',
      'bg-blue-100 text-blue-600',
      'bg-green-100 text-green-600',
      'bg-yellow-100 text-yellow-600',
      'bg-pink-100 text-pink-600'
    ];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden bg-background">
      <div className="flex h-full">
        {/* Channel List */}
        <div className={`${
          isMobile 
            ? showChannelList 
              ? 'absolute inset-0 z-30 bg-background' 
              : 'hidden'
            : 'w-80'
          } border-r flex flex-col bg-gray-50/50`}>
          <div className="p-4 border-b safe-area-top bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Canaux</h2>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDirectMessageDialog(true)}
                  className="h-9 w-9 p-0"
                >
                  <UserPlus className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateDialog(true)}
                  className="h-9 w-9 p-0"
                >
                  <PlusCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <Input
              placeholder="Rechercher un canal..."
              className="w-full"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                  selectedChannel?.id === channel.id ? 'bg-accent' : ''
                }`}
                onClick={() => {
                  setSelectedChannel(channel);
                  if (isMobile) setShowChannelList(false);
                }}
              >
                <span className="truncate text-sm font-medium">
                  {editingChannel?.id === channel.id ? (
                    <Input
                      value={editingChannel.name}
                      onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          handleRename(channel.id, editingChannel.name);
                        } else if (e.key === 'Escape') {
                          setEditingChannel(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8"
                      autoFocus
                    />
                  ) : (
                    channel.display_name
                  )}
                </span>
                {selectedChannel?.id === channel.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingChannel({ id: channel.id, name: channel.display_name });
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMemberManagement(true);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChannelToDelete(channel);
                        setShowDeleteDialog(true);
                      }}
                      className="h-8 w-8 p-0 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${isMobile && !showChannelList ? 'absolute inset-0 z-20 bg-background' : ''}`}>
          {selectedChannel ? (
            <>
              <div className="p-4 border-b safe-area-top bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-3">
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChannelList(true)}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  )}
                  <h2 className="text-lg font-semibold flex-1">{selectedChannel.display_name}</h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.sender?.id === currentUserId ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      {message.sender?.avatarUrl ? (
                        <AvatarImage src={message.sender.avatarUrl} />
                      ) : (
                        <AvatarFallback className={`${getAvatarColor(message.sender?.id || '')}`}>
                          {message.sender?.name.substring(0, 2) || '??'}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className={`flex-1 max-w-[70%] space-y-1 ${
                      message.sender?.id === currentUserId ? 'items-end' : 'items-start'
                    }`}>
                      <div className={`flex items-center gap-2 text-sm ${
                        message.sender?.id === currentUserId ? 'flex-row-reverse' : 'flex-row'
                      }`}>
                        <span className="font-medium">{message.sender?.name}</span>
                        <span className="text-gray-500 text-xs">
                          {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                        </span>
                      </div>

                      <div className={`group relative ${
                        message.sender?.id === currentUserId 
                          ? 'bg-purple-50 text-purple-900' 
                          : 'bg-gray-50 text-gray-900'
                        } rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-shadow`}>
                        <div className="text-sm break-words">{message.content}</div>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {message.sender?.id === currentUserId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMessage(message.id, message.sender_id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReply(message)}
                            className="h-8 w-8 p-0"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Message Attachments */}
                      {message.attachments?.map((attachment, attachmentIndex) => (
                        <div key={attachmentIndex} className="relative group">
                          <MessageAttachment
                            url={attachment.url}
                            filename={attachment.filename}
                            locale="fr"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-4 bg-background safe-area-bottom">
                {replyTo && (
                  <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-accent/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      En réponse à : {replyTo.sender?.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyTo(null)}
                      className="h-6 px-2 text-xs"
                    >
                      Annuler
                    </Button>
                  </div>
                )}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(e);
                }}>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        value={newMessage}
                        onChange={handleInput}
                        placeholder="Écrivez un message..."
                        className="pr-24"
                      />
                      {showMentions && (
                        <MentionSuggestions
                          suggestions={suggestions}
                          onSelect={handleMentionSelect}
                          visible={showMentions}
                        />
                      )}
                      <div className="absolute right-2 bottom-1/2 translate-y-1/2 flex items-center gap-1">
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
                          <PopoverContent className="w-auto p-0" side="top" align="end">
                            <Picker
                              data={data}
                              onEmojiSelect={(emoji: any) => {
                                handleEmojiSelect(emoji);
                              }}
                              locale="fr"
                            />
                          </PopoverContent>
                        </Popover>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          multiple
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
                        <Button
                          type="submit"
                          size="icon"
                          className="h-8 w-8"
                          disabled={!newMessage.trim() || isUploading}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">
              <p>Sélectionnez un canal pour commencer à discuter</p>
            </div>
          )}
        </div>
      </div>

      <CreateChannelDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onChannelCreated={handleChannelCreated}
      />
      <NewDirectMessageDialog
        isOpen={showDirectMessageDialog}
        onClose={() => setShowDirectMessageDialog(false)}
        onChannelCreated={handleChannelCreated}
      />
      {selectedChannel && (
        <ChannelMemberManagement
          isOpen={showMemberManagement}
          onClose={() => setShowMemberManagement(false)}
          channelId={selectedChannel.id}
        />
      )}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce canal ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les messages et les données associés seront supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChannel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
