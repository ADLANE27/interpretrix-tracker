import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Paperclip, 
  Send, 
  Smile, 
  Trash2,
  ArrowRight,
  MessageSquare,
  X,
  ArrowDown,
  Bell,
  Filter
} from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { MentionSuggestions } from '@/components/chat/MentionSuggestions';
import { format } from 'date-fns';
import { ChatFilters } from '@/components/chat/ChatFilters';
import { MentionsPopover } from '@/components/chat/MentionsPopover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadMentions } from '@/hooks/chat/useUnreadMentions';
import { Message } from '@/types/messaging';

interface InterpreterChatProps {
  channelId: string;
  filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
  onFiltersChange: (filters: InterpreterChatProps['filters']) => void;
  onClearFilters: () => void;
  isFullScreen?: boolean;
}

export const InterpreterChat = ({ channelId, filters, onFiltersChange, onClearFilters, isFullScreen = false }: InterpreterChatProps) => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    sender: { name: string };
  } | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<Array<{
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'interpreter';
    type?: 'language';
  }>>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { messages, sendMessage, deleteMessage, currentUserId, markMentionsAsRead } = useChat(channelId);
  const { 
    unreadMentions, 
    totalUnreadCount, 
    markMentionAsRead: markMentionAsReadNew, 
    deleteMention 
  } = useUnreadMentions();

  const fetchMentionSuggestions = async (search: string) => {
    try {
      if (!channelId) {
        console.log('[InterpreterChat Debug] No channel ID provided');
        return;
      }

      const { data: languages, error: languagesError } = await supabase
        .rpc('get_channel_target_languages', { channel_id: channelId });

      if (languagesError) {
        console.error('[InterpreterChat Debug] Error fetching languages:', languagesError);
      } else {
        console.log('[InterpreterChat Debug] Available languages:', languages);
      }

      const { data: members, error: membersError } = await supabase
        .rpc('get_channel_members', { channel_id: channelId });

      if (membersError) {
        console.error('[InterpreterChat Debug] Error fetching members:', membersError);
        setMentionSuggestions([]);
        return;
      }

      const suggestions: Array<{
        id: string;
        name: string;
        email: string;
        role: 'admin' | 'interpreter';
        type?: 'language';
      }> = [];

      if (languages) {
        const languageSuggestions = languages
          .filter(lang => 
            lang.target_language.toLowerCase().includes(search.toLowerCase())
          )
          .map(lang => {
            console.log('[InterpreterChat Debug] Adding language suggestion:', lang.target_language);
            return {
              id: `lang_${lang.target_language}`,
              name: lang.target_language,
              email: '',
              role: 'interpreter' as const,
              type: 'language' as const
            };
          });
        suggestions.push(...languageSuggestions);
      }

      if (Array.isArray(members)) {
        const memberSuggestions = members
          .filter(member => {
            const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
            return fullName.includes(search.toLowerCase()) || 
                   member.email.toLowerCase().includes(search.toLowerCase());
          })
          .map(member => ({
            id: member.user_id,
            name: `${member.first_name} ${member.last_name}`,
            email: member.email,
            role: member.role as 'admin' | 'interpreter'
          }));
        suggestions.push(...memberSuggestions);
      }

      console.log('[InterpreterChat Debug] Final suggestions:', suggestions);
      setMentionSuggestions(suggestions);
    } catch (error) {
      console.error('[InterpreterChat Debug] Error in fetchMentionSuggestions:', error);
      setMentionSuggestions([]);
    }
  };

  const handleMentionSelect = async (suggestion: any) => {
    try {
      const beforeMention = message.substring(0, message.lastIndexOf('@'));
      const afterMention = message.substring(cursorPosition);
      
      if (suggestion.type === 'language') {
        console.log('[InterpreterChat Debug] Selected language mention:', suggestion.name);
        const mentionText = `@${suggestion.name}`;
        setMessage(`${beforeMention}${mentionText} ${afterMention}`);
        
        const { data: interpreters, error } = await supabase
          .rpc('get_channel_interpreters_by_language', {
            p_channel_id: channelId,
            p_target_language: suggestion.name
          });

        if (error) {
          console.error('[InterpreterChat Debug] Error fetching interpreters:', error);
          toast({
            title: "Erreur",
            description: "Impossible de récupérer les interprètes pour cette langue",
            variant: "destructive",
          });
          return;
        }

        if (interpreters && interpreters.length > 0) {
          console.log('[InterpreterChat Debug] Found interpreters for language:', interpreters);
        }
      } else {
        setMessage(`${beforeMention}@${suggestion.name} ${afterMention}`);
      }
      
      setShowMentions(false);
      textareaRef.current?.focus();
    } catch (error) {
      console.error('[InterpreterChat Debug] Error in handleMentionSelect:', error);
      toast({
        title: "Erreur",
        description: "Impossible de traiter la mention",
        variant: "destructive",
      });
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    setCursorPosition(e.target.selectionStart);

    const lastAtSymbol = newMessage.lastIndexOf('@', e.target.selectionStart);
    if (lastAtSymbol !== -1 && lastAtSymbol === newMessage.lastIndexOf('@')) {
      const searchTerm = newMessage.substring(lastAtSymbol + 1, e.target.selectionStart);
      setMentionSearch(searchTerm);
      setShowMentions(true);
      fetchMentionSuggestions(searchTerm);
    } else {
      setShowMentions(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-chat-attachment', {
        body: formData,
      });

      if (uploadError) throw uploadError;

      const attachment = {
        url: uploadData.url,
        filename: file.name,
        type: file.type,
        size: file.size
      };

      await sendMessage(message, undefined, [attachment]);
      setMessage('');
    } catch (error) {
      console.error('[InterpreterChat] Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleReplyClick = (messageToReply: any) => {
    setReplyingTo(messageToReply);
    textareaRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !fileInputRef.current?.files?.length) return;

    try {
      await sendMessage(message, replyingTo?.id);
      setMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('[InterpreterChat] Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMentionClick = (mention: any) => {
    if (mention.channel_id !== channelId) {
      console.log('[Chat Debug] Need to switch to channel:', mention.channel_id);
    }

    const messageElement = document.getElementById(`message-${mention.message_id}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('bg-accent/50');
      setTimeout(() => {
        messageElement.classList.remove('bg-accent/50');
      }, 2000);
    }

    markMentionAsReadNew(mention.mention_id);
  };

  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);

  const fetchThreadMessages = async (parentMessageId: string) => {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('parent_message_id', parentMessageId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = await Promise.all(
        messages.map(async (msg) => {
          const { data: senderDetails } = await supabase
            .rpc('get_message_sender_details', { sender_id: msg.sender_id });
          
          let parsedReactions: Record<string, string[]> = {};
          if (typeof msg.reactions === 'object' && msg.reactions !== null) {
            parsedReactions = Object.entries(msg.reactions).reduce((acc, [key, value]) => {
              acc[key] = Array.isArray(value) 
                ? value.map(item => String(item)) 
                : [];
              return acc;
            }, {} as Record<string, string[]>);
          }
          
          return {
            id: msg.id,
            content: msg.content,
            sender: senderDetails[0],
            timestamp: new Date(msg.created_at),
            parent_message_id: msg.parent_message_id,
            reactions: parsedReactions
          } as Message;
        })
      );

      setThreadMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      toast({
        title: "Error",
        description: "Failed to load thread messages",
        variant: "destructive",
      });
    }
  };

  const [threadCounts, setThreadCounts] = useState<Record<string, number>>({});

  const fetchThreadCounts = async () => {
    try {
      const { data: counts, error } = await supabase
        .from('chat_messages')
        .select('parent_message_id, id')
        .not('parent_message_id', 'is', null);

      if (error) throw error;

      // Count messages for each parent_message_id
      const countsMap = counts.reduce((acc, curr) => {
        const parentId = curr.parent_message_id;
        if (parentId) {
          acc[parentId] = (acc[parentId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      setThreadCounts(countsMap);
    } catch (error) {
      console.error('Error fetching thread counts:', error);
    }
  };

  const handleThreadClick = async (message: Message) => {
    setSelectedThread(message);
    await fetchThreadMessages(message.id);
  };

  const handleCloseThread = () => {
    setSelectedThread(null);
    setThreadMessages([]);
  };

  const handleSendThreadMessage = async () => {
    if (!message.trim() || !selectedThread) return;

    try {
      await sendMessage(message, selectedThread.id);
      setMessage('');
      await fetchThreadMessages(selectedThread.id);
      await fetchThreadCounts(); // Update thread counts after sending a message
    } catch (error) {
      console.error('Error sending thread message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const [channelUsers, setChannelUsers] = useState<Array<{ id: string; name: string; }>>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);

  useEffect(() => {
    const fetchChannelUsers = async () => {
      try {
        const { data: users, error } = await supabase
          .rpc('get_channel_members', { channel_id: channelId });

        if (error) throw error;

        setChannelUsers(users.map(user => ({
          id: user.user_id,
          name: `${user.first_name} ${user.last_name}`
        })));
      } catch (error) {
        console.error('Error fetching channel users:', error);
      }
    };

    if (channelId) {
      fetchChannelUsers();
    }
  }, [channelId]);

  useEffect(() => {
    if (messages) {
      let filtered = [...messages];

      if (filters.userId) {
        filtered = filtered.filter(msg => msg.sender.id === filters.userId);
      }

      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        filtered = filtered.filter(msg => 
          msg.content.toLowerCase().includes(keyword) ||
          msg.sender.name.toLowerCase().includes(keyword)
        );
      }

      if (filters.date) {
        filtered = filtered.filter(msg => {
          const msgDate = new Date(msg.timestamp);
          const filterDate = new Date(filters.date!);
          return (
            msgDate.getDate() === filterDate.getDate() &&
            msgDate.getMonth() === filterDate.getMonth() &&
            msgDate.getFullYear() === filterDate.getFullYear()
          );
        });
      }

      setFilteredMessages(filtered);
    }
  }, [messages, filters]);

  useEffect(() => {
    fetchThreadCounts();
  }, [messages]);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleScroll = (event: any) => {
    const element = event.target;
    const scrollPosition = element.scrollTop;
    const maxScroll = element.scrollHeight - element.clientHeight;
    const threshold = 500; // Show button when user has scrolled up 500px from bottom
    
    setShowScrollButton(maxScroll - scrollPosition > threshold);
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollableElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollableElement) {
        scrollableElement.scrollTop = scrollableElement.scrollHeight;
      }
    }
  };

  useEffect(() => {
    if (messages && messages.length > 0 && !showScrollButton) {
      scrollToBottom();
    }
  }, [messages]);

  return (
    <div className={cn(
      "flex flex-col rounded-lg bg-white shadow-lg",
      isFullScreen ? "h-[calc(100vh-32px)]" : "h-[calc(100vh-300px)]"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Messages</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-violet-500 hover:text-violet-600 hover:bg-violet-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <MentionsPopover
            mentions={unreadMentions}
            totalCount={totalUnreadCount}
            onMentionClick={handleMentionClick}
            onMarkAsRead={markMentionAsReadNew}
            onDelete={deleteMention}
          >
            <div className={cn(
              "transition-all duration-200 p-2",
              "hover:bg-violet-50 cursor-pointer rounded-full",
              "flex items-center justify-center relative",
              totalUnreadCount > 0 && "text-violet-500"
            )}>
              <Bell className="h-5 w-5" />
              {totalUnreadCount > 0 && (
                <Badge 
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {totalUnreadCount}
                </Badge>
              )}
            </div>
          </MentionsPopover>
        </div>
      </div>

      <ScrollArea 
        ref={scrollAreaRef}
        className="flex-1 px-4"
        onScrollCapture={handleScroll}
      >
        <div className="space-y-6 py-4">
          {filteredMessages.map(message => (
            <div 
              key={message.id} 
              id={`message-${message.id}`}
              className="group flex gap-3 hover:bg-gray-50/50 rounded-lg p-3 transition-all"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-violet-100 text-violet-500">
                  {message.sender.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">
                    {message.sender.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {format(message.timestamp, 'HH:mm')}
                  </span>
                </div>
                <div className="text-gray-800">
                  {message.content}
                </div>
              </div>
              {currentUserId === message.sender.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMessage(message.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          className="fixed bottom-[180px] right-4 rounded-full shadow-lg bg-white hover:bg-gray-50"
          size="icon"
          variant="outline"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      <div className="p-4 border-t bg-white">
        <div className="relative rounded-lg bg-gray-50 transition-all">
          {replyingTo && (
            <div className="px-3 py-2 bg-gray-100 border-b rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ArrowRight className="h-4 w-4" />
                <span>Replying to {replyingTo.sender.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelReply}
                className="hover:bg-gray-200/80 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              placeholder="Write your message..."
              className="min-h-[60px] resize-none border-0 bg-transparent focus-visible:ring-0 text-base placeholder:text-gray-500"
            />

            <MentionSuggestions
              suggestions={mentionSuggestions}
              onSelect={handleMentionSelect}
              visible={showMentions}
            />

            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-8 w-8 rounded-full hover:bg-gray-200/80"
              >
                <Paperclip className="h-4 w-4 text-gray-600" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-gray-200/80"
                  >
                    <Smile className="h-4 w-4 text-gray-600" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="end">
                  <Picker
                    data={data}
                    onEmojiSelect={(emoji: any) => setMessage(prev => prev + emoji.native)}
                    theme="light"
                  />
                </PopoverContent>
              </Popover>

              <Button 
                onClick={handleSendMessage}
                disabled={isUploading || (!message.trim() && !fileInputRef.current?.files?.length)}
                size="icon"
                className="h-8 w-8 rounded-full bg-violet-500 hover:bg-violet-600 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
