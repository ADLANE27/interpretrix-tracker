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
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2
} from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { MentionSuggestions } from '@/components/chat/MentionSuggestions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useUnreadMentions } from '@/hooks/chat/useUnreadMentions';
import { ChatFilters } from '@/components/chat/ChatFilters';
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

export const InterpreterChat = ({ 
  channelId,
  filters,
  onFiltersChange,
  onClearFilters,
  isFullScreen = false
}: InterpreterChatProps) => {
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

  const handleBoldClick = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);
    
    const beforeText = message.substring(0, start);
    const afterText = message.substring(end);

    if (selectedText) {
      const newMessage = `${beforeText}**${selectedText}**${afterText}`;
      setMessage(newMessage);
      textarea.focus();
      setTimeout(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = end + 2;
      }, 0);
    } else {
      const newMessage = `${beforeText}****${afterText}`;
      setMessage(newMessage);
      textarea.focus();
      setTimeout(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleItalicClick = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);
    
    const beforeText = message.substring(0, start);
    const afterText = message.substring(end);

    if (selectedText) {
      const newMessage = `${beforeText}_${selectedText}_${afterText}`;
      setMessage(newMessage);
      textarea.focus();
      setTimeout(() => {
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = end + 1;
      }, 0);
    } else {
      const newMessage = `${beforeText}__${afterText}`;
      setMessage(newMessage);
      textarea.focus();
      setTimeout(() => {
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = start + 1;
      }, 0);
    }
  };

  return (
    <div className={cn(
      "flex flex-col relative",
      isFullScreen ? "h-[calc(100vh-32px)]" : "h-[calc(100vh-300px)]",
      "bg-white"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
      </div>

      <ChatFilters
        onFiltersChange={onFiltersChange}
        users={channelUsers}
        onClearFilters={onClearFilters}
      />

      <div className="flex flex-1 overflow-hidden relative h-full">
        <div className={cn(
          "flex-1 flex flex-col relative h-full",
          selectedThread ? "hidden lg:flex lg:w-2/3" : "w-full"
        )}>
          <ScrollArea 
            ref={scrollAreaRef}
            className="flex-1 h-full"
            onScrollCapture={handleScroll}
          >
            <div className="py-4">
              {filteredMessages.map(message => (
                <div 
                  key={message.id} 
                  id={`message-${message.id}`}
                  className="chat-message-container message-appear"
                >
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {message.sender.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="chat-message-header">
                      <span className="chat-message-sender">{message.sender.name}</span>
                      <span className="chat-message-time">
                        {format(message.timestamp, 'HH:mm')}
                      </span>
                    </div>
                    {message.parent_message_id && (
                      <div className="ml-0 pl-2 border-l-2 border-gray-200 text-xs text-gray-500 mb-1">
                        <p>Reply to {messages.find(m => m.id === message.parent_message_id)?.sender.name}</p>
                      </div>
                    )}
                    <p className="chat-message-content">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {showScrollButton && (
            <Button
              onClick={scrollToBottom}
              className="fixed bottom-[180px] right-4 rounded-full shadow-lg bg-white hover:bg-gray-100 z-10"
              size="icon"
              variant="outline"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}

          <div className="chat-input-wrapper">
            <div className="chat-input-container">
              {replyingTo && (
                <div className="px-3 py-2 bg-blue-50 border-b rounded-t-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <ArrowRight className="h-4 w-4" />
                    <span>Replying to {replyingTo.sender.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelReply}
                    className="hover:bg-blue-100 transition-colors h-7 w-7"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="chat-toolbar">
                <Button variant="ghost" size="sm" className="chat-toolbar-button">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="chat-toolbar-button">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="chat-toolbar-button">
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="chat-toolbar-button">
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="chat-toolbar-button">
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>

              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                onKeyPress={handleKeyPress}
                placeholder="Écrivez votre message..."
                className="chat-input-field"
              />

              <MentionSuggestions
                suggestions={mentionSuggestions}
                onSelect={handleMentionSelect}
                visible={showMentions}
              />

              <div className="chat-input-actions">
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
                  className="chat-action-button"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="chat-action-button"
                    >
                      <Smile className="h-4 w-4" />
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
                  className="chat-send-button"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {selectedThread && (
          <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm lg:static lg:w-1/3 lg:border-l flex flex-col">
            <div className="p-3 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold">Conversation</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseThread}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-3 bg-gray-50 border-b">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-interpreter-navy text-white">
                    {selectedThread.sender.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{selectedThread.sender.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(selectedThread.timestamp, 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{selectedThread.content}</p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4">
              {threadMessages.map(message => (
                <div key={message.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-interpreter-navy text-white">
                        {message.sender.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{message.sender.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(message.timestamp, 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>

            <div className="p-4 border-t bg-white">
              <div className="relative rounded-lg border bg-background">
                <Textarea
                  value={message}
                  onChange={handleMessageChange}
                  placeholder="Répondre dans la conversation..."
                  className="min-h-[80px] resize-none border-0 focus-visible:ring-0"
                />
                <div className="absolute bottom-2 right-2">
                  <Button 
                    onClick={handleSendThreadMessage}
                    className="h-8 bg-interpreter-navy hover:bg-interpreter-navy/90"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Répondre
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
