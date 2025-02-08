import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Paperclip, 
  Send, 
  Smile, 
  Trash2,
  ArrowRight,
  MessageSquare,
  X
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
import { MentionsPopover } from "@/components/chat/MentionsPopover";
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
}

export const InterpreterChat = ({ 
  channelId,
  filters,
  onFiltersChange,
  onClearFilters
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

  return (
    <div className="flex flex-col h-[calc(100vh-400px)]">
      <div className="flex items-center justify-between p-2 sm:px-4 sm:py-2 border-b">
        <h2 className="text-base sm:text-lg font-semibold text-interpreter-navy">Messages</h2>
        <MentionsPopover
          mentions={unreadMentions}
          totalCount={totalUnreadCount}
          onMentionClick={handleMentionClick}
          onMarkAsRead={markMentionAsReadNew}
          onDelete={deleteMention}
        />
      </div>

      <ChatFilters
        onFiltersChange={onFiltersChange}
        users={channelUsers}
        onClearFilters={onClearFilters}
        className="p-2 sm:p-4"
      />

      <div className="flex flex-1 overflow-hidden">
        <div className={cn(
          "flex-1 flex flex-col",
          selectedThread ? "hidden lg:flex lg:w-2/3" : "w-full"
        )}>
          <ScrollArea className="flex-1 px-2 sm:px-4">
            {filteredMessages.map(message => (
              <div 
                key={message.id} 
                id={`message-${message.id}`}
                className="mb-2 sm:mb-4 group transition-colors duration-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm sm:text-base">{message.sender.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(message.timestamp, 'HH:mm')}
                      </span>
                    </div>
                    {message.parent_message_id && (
                      <div className="ml-4 pl-2 border-l-2 border-gray-200 text-xs sm:text-sm text-muted-foreground mb-1">
                        <p>En réponse à {messages.find(m => m.id === message.parent_message_id)?.sender.name}</p>
                      </div>
                    )}
                    <div className="mt-1 group">
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm sm:text-base break-words">{message.content}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0"
                          onClick={() => handleThreadClick(message)}
                        >
                          <MessageSquare className="h-4 w-4" />
                          {threadCounts[message.id] > 0 && (
                            <span className="text-xs bg-primary/10 px-1.5 py-0.5 rounded-full">
                              {threadCounts[message.id]}
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  {currentUserId === message.sender.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMessage(message.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </ScrollArea>

          <div className="border-t p-2 sm:p-4 bg-white">
            <div className="relative">
              {replyingTo && (
                <div className="mb-2 p-2 bg-gray-50 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <ArrowRight className="h-4 w-4" />
                    <span>En réponse à {replyingTo.sender.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelReply}
                    className="text-xs sm:text-sm"
                  >
                    Annuler
                  </Button>
                </div>
              )}
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                onKeyPress={handleKeyPress}
                placeholder="Écrivez votre message..."
                className="min-h-[60px] sm:min-h-[80px] text-sm sm:text-base pr-24"
              />

              <MentionSuggestions
                suggestions={mentionSuggestions}
                onSelect={handleMentionSelect}
                visible={showMentions}
              />

              <div className="absolute bottom-2 right-2 flex items-center gap-1">
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
                  className="h-8 w-8"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
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
                  className="text-sm sm:text-base h-8"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            </div>
          </div>
        </div>

        {selectedThread && (
          <div className="fixed inset-0 z-50 bg-white lg:static lg:w-1/3 lg:border-l flex flex-col">
            <div className="p-2 sm:p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm sm:text-base">Conversation</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseThread}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-2 sm:p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-sm sm:text-base">{selectedThread.sender.name}</span>
                <span className="text-xs text-muted-foreground">
                  {format(selectedThread.timestamp, 'HH:mm')}
                </span>
              </div>
              <p className="text-sm sm:text-base">{selectedThread.content}</p>
            </div>

            <ScrollArea className="flex-1 px-3 sm:px-4">
              {threadMessages.map(message => (
                <div key={message.id} className="py-2">
                  <div className="flex items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base">{message.sender.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(message.timestamp, 'HH:mm')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm sm:text-base">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>

            <div className="p-2 sm:p-4 border-t">
              <Textarea
                value={message}
                onChange={handleMessageChange}
                placeholder="Répondre dans la conversation..."
                className="min-h-[60px] sm:min-h-[80px] text-sm sm:text-base mb-2"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleSendThreadMessage}
                  className="text-sm sm:text-base"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Répondre
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
