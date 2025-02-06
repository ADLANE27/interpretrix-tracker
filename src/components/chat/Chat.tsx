import { useChat } from "@/hooks/useChat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Trash2, Paperclip, Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

interface ChatProps {
  channelId: string;
}

interface MentionSuggestion {
  id: string;
  name: string;
  email: string;
}

export const Chat = ({ channelId }: ChatProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { messages, sendMessage, isLoading, deleteMessage, currentUserId } = useChat(channelId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await sendMessage(newMessage);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-chat-attachment', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const { url } = await response.json();
      await sendMessage(`[File: ${file.name}](${url})`);
    } catch (error) {
      console.error("Failed to upload file:", error);
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage(prev => prev + emoji.native);
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    const position = e.target.selectionStart || 0;
    setCursorPosition(position);

    // Check for @ mentions
    const lastAtSymbol = value.lastIndexOf('@', position);
    if (lastAtSymbol !== -1 && lastAtSymbol < position) {
      const query = value.slice(lastAtSymbol + 1, position);
      setMentionQuery(query);
      await fetchMentionSuggestions(query);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const fetchMentionSuggestions = async (query: string) => {
    try {
      const { data: members } = await supabase
        .rpc('get_channel_members', { channel_id: channelId });

      if (members) {
        const suggestions = members
          .filter(member => 
            member.first_name.toLowerCase().includes(query.toLowerCase()) ||
            member.last_name.toLowerCase().includes(query.toLowerCase()) ||
            member.email.toLowerCase().includes(query.toLowerCase())
          )
          .map(member => ({
            id: member.user_id,
            name: `${member.first_name} ${member.last_name}`,
            email: member.email
          }));
        setMentionSuggestions(suggestions);
      }
    } catch (error) {
      console.error("Error fetching mention suggestions:", error);
    }
  };

  const handleMentionSelect = async (suggestion: MentionSuggestion) => {
    const lastAtSymbol = newMessage.lastIndexOf('@', cursorPosition);
    const beforeMention = newMessage.slice(0, lastAtSymbol);
    const afterMention = newMessage.slice(cursorPosition);
    const newValue = `${beforeMention}@${suggestion.name} ${afterMention}`;
    setNewMessage(newValue);
    setShowMentions(false);

    // Create mention record
    try {
      const { data: messageData } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          sender_id: currentUserId,
          content: newValue,
        })
        .select()
        .single();

      if (messageData) {
        await supabase
          .from('message_mentions')
          .insert({
            channel_id: channelId,
            message_id: messageData.id,
            mentioned_user_id: suggestion.id,
            status: 'unread'
          });
      }
    } catch (error) {
      console.error("Error creating mention:", error);
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex items-start gap-3 group">
              <Avatar>
                <AvatarImage src={message.sender.avatarUrl} />
                <AvatarFallback>
                  {message.sender.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{message.sender.name}</span>
                  <span className="text-sm text-gray-500">
                    {format(message.timestamp, 'HH:mm')}
                  </span>
                </div>
                <p className="text-gray-700">{message.content}</p>
              </div>
              {(message.sender.id === currentUserId) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeleteMessage(message.id)}
                >
                  <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <form onSubmit={handleSendMessage} className="p-4 border-t relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            disabled={isLoading}
          />
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="light"
              />
            </PopoverContent>
          </Popover>

          <Button type="submit" disabled={isLoading || !newMessage.trim()}>
            Envoyer
          </Button>
        </div>

        {showMentions && mentionSuggestions.length > 0 && (
          <div className="absolute bottom-full left-0 w-full bg-white border rounded-lg shadow-lg mb-2 max-h-48 overflow-y-auto">
            <Command>
              <CommandGroup>
                {mentionSuggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion.id}
                    onSelect={() => handleMentionSelect(suggestion)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>
                        {suggestion.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{suggestion.name}</span>
                      <span className="text-sm text-gray-500">{suggestion.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </div>
        )}
      </form>
    </div>
  );
};