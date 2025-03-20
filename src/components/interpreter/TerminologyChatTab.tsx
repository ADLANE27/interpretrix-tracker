
import { useState, useRef, useEffect } from "react";
import { Trash2, Send, MessageSquare, Plus, ChevronRight, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTerminologyChat } from "@/hooks/useTerminologyChat";
import { TerminologyChatMessage } from "@/types/terminology-chat";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TerminologyChatTabProps {
  userId?: string;
}

export const TerminologyChatTab = ({ userId }: TerminologyChatTabProps) => {
  const [message, setMessage] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<string>("Français");
  const [targetLanguage, setTargetLanguage] = useState<string>("Anglais");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [previousMessages, setPreviousMessages] = useState<TerminologyChatMessage[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  
  const messageEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const {
    chatHistory,
    getChatMessages,
    sendMessage,
    deleteChat,
    isLoading,
    isChatsLoading,
  } = useTerminologyChat(userId);

  const { data: chatMessages, isLoading: isMessagesLoading, refetch: refetchMessages } = getChatMessages(activeChatId || undefined);

  useEffect(() => {
    if (chatMessages) {
      setPreviousMessages(chatMessages);
      setPendingMessage(null); // Clear pending message when we get real messages
      
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un message",
        variant: "destructive"
      });
      return;
    }
    
    const userMessage = message.trim();
    
    try {
      // Show optimistic update with user message
      if (activeChatId) {
        // Add the user message optimistically
        const optimisticUserMessage: TerminologyChatMessage = {
          id: `temp-${Date.now()}`,
          chat_id: activeChatId,
          role: 'user',
          content: userMessage,
          created_at: new Date().toISOString()
        };
        
        setPreviousMessages(prev => [...prev, optimisticUserMessage]);
        
        // Clear the input and scroll to bottom
        setMessage("");
        setTimeout(() => {
          messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        // This is a new chat, so we'll just clear the input
        setMessage("");
      }
      
      // Prepare previous messages for context (last 10 messages)
      const contextMessages = previousMessages
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      // Add "now typing" indicator for assistant
      const tempTimestamp = new Date().toISOString();
      setPendingMessage("L'assistant est en train de répondre...");
      
      // Send the message
      const response = await sendMessage({
        message: userMessage,
        sourceLanguage,
        targetLanguage,
        conversationId: activeChatId || undefined,
        previousMessages: contextMessages
      });
      
      // If this is a new chat, update the active chat ID
      if (response.isNewChat) {
        setActiveChatId(response.chatId);
        refetchMessages();
      }
      
      // Make sure the messages are refreshed
      refetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      // Toast error is handled in the hook
      setPendingMessage(null);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette conversation ?")) {
      try {
        await deleteChat(chatId);
        if (activeChatId === chatId) {
          setActiveChatId(null);
          setPreviousMessages([]);
        }
      } catch (error) {
        console.error("Error deleting chat:", error);
        // Toast error is handled in the hook
      }
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setPreviousMessages([]);
    setMessage("");
    setPendingMessage(null);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: fr
      });
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-4">Assistance Terminologique</h2>
      
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Chat List Sidebar */}
        <div 
          className={cn(
            "flex-shrink-0 w-64 transition-all duration-300 overflow-hidden",
            showSidebar ? "w-64" : "w-0"
          )}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Conversations</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              title="Nouvelle conversation"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="overflow-y-auto pr-2 space-y-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
            {isChatsLoading ? (
              <div className="flex justify-center items-center h-20">
                <LoadingSpinner size="md" />
              </div>
            ) : chatHistory && chatHistory.length > 0 ? (
              chatHistory.map(chat => (
                <Card 
                  key={chat.id} 
                  className={cn(
                    "cursor-pointer hover:bg-muted transition-colors",
                    activeChatId === chat.id ? "border-primary" : ""
                  )}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 overflow-hidden">
                        <p className="font-medium truncate">{chat.title}</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span className="truncate">
                            {chat.source_language} → {chat.target_language}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimestamp(chat.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-2 text-red-500 hover:text-red-700 hover:bg-red-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(chat.id);
                        }}
                        title="Supprimer la conversation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aucune conversation</p>
                <p className="text-sm">Commencez une nouvelle conversation</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Toggle Sidebar Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 self-start mt-12 -mr-4 z-10 bg-background border"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          {showSidebar ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden border rounded-lg bg-white dark:bg-gray-950">
          {/* Language Selection & New Chat Button */}
          <div className="p-4 border-b flex flex-wrap gap-2 sm:flex-nowrap">
            <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Langue source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Français">Français</SelectItem>
                <SelectItem value="Anglais">Anglais</SelectItem>
                <SelectItem value="Espagnol">Espagnol</SelectItem>
                <SelectItem value="Allemand">Allemand</SelectItem>
                <SelectItem value="Italien">Italien</SelectItem>
                <SelectItem value="Portugais">Portugais</SelectItem>
                <SelectItem value="Arabe">Arabe</SelectItem>
                <SelectItem value="Russe">Russe</SelectItem>
                <SelectItem value="Chinois">Chinois</SelectItem>
                <SelectItem value="Japonais">Japonais</SelectItem>
              </SelectContent>
            </Select>

            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Langue cible" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Français">Français</SelectItem>
                <SelectItem value="Anglais">Anglais</SelectItem>
                <SelectItem value="Espagnol">Espagnol</SelectItem>
                <SelectItem value="Allemand">Allemand</SelectItem>
                <SelectItem value="Italien">Italien</SelectItem>
                <SelectItem value="Portugais">Portugais</SelectItem>
                <SelectItem value="Arabe">Arabe</SelectItem>
                <SelectItem value="Russe">Russe</SelectItem>
                <SelectItem value="Chinois">Chinois</SelectItem>
                <SelectItem value="Japonais">Japonais</SelectItem>
              </SelectContent>
            </Select>
            
            {activeChatId && (
              <Button 
                variant="outline" 
                size="icon" 
                className="flex-shrink-0"
                onClick={handleNewChat}
                title="Nouvelle conversation"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ maxHeight: 'calc(100vh - 350px)' }}
          >
            {isMessagesLoading ? (
              <div className="flex justify-center items-center h-20">
                <LoadingSpinner size="md" />
              </div>
            ) : previousMessages && previousMessages.length > 0 ? (
              <>
                {previousMessages.map((msg, index) => (
                  <div 
                    key={msg.id || index} 
                    className={cn(
                      "flex max-w-[90%]", 
                      msg.role === 'user' ? "ml-auto" : "mr-auto"
                    )}
                  >
                    <div 
                      className={cn(
                        "px-4 py-3 rounded-lg",
                        msg.role === 'user' 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-muted rounded-tl-none"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <div className="text-xs mt-1 opacity-70">
                        {formatTimestamp(msg.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {pendingMessage && (
                  <div className="flex max-w-[90%] mr-auto">
                    <div className="px-4 py-3 rounded-lg bg-muted rounded-tl-none animate-pulse">
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="xs" />
                        <span>{pendingMessage}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Assistant Terminologique</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Posez des questions sur la terminologie, demandez des traductions ou des explications linguistiques entre {sourceLanguage} et {targetLanguage}.
                </p>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p>Exemples de questions :</p>
                  <ul className="space-y-1 text-left list-disc pl-5">
                    <li>Comment traduire "dispositif médical" en anglais ?</li>
                    <li>Quelle est la différence entre "agreement" et "contract" ?</li>
                    <li>Expliquez l'expression "to beat around the bush"</li>
                  </ul>
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tapez votre message..."
                className="flex-1 min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading || !message.trim()}
                className="self-end"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
