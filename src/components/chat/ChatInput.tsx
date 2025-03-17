
import React, { useRef, useState, KeyboardEvent, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Smile } from "lucide-react";
import { Message } from '@/types/messaging';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { ChatConnectionWarning } from './ChatConnectionWarning';
import { ChatReplyIndicator } from './ChatReplyIndicator';
import { ChatAttachmentsPreview } from './ChatAttachmentsPreview';
import { ChatSendingStatus } from './ChatSendingStatus';
import { useEmojiPicker } from '@/hooks/chat/useEmojiPicker';

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSendMessage: () => Promise<void>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
  handleRemoveAttachment: (index: number) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
  isLoading?: boolean;
  isSubscribed?: boolean;
}

export const ChatInput = ({
  message,
  setMessage,
  onSendMessage,
  handleFileChange,
  attachments,
  handleRemoveAttachment,
  inputRef,
  replyTo,
  setReplyTo,
  isLoading = false,
  isSubscribed = true
}: ChatInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(window.navigator.onLine);
  const { toast } = useToast();
  const { handleEmojiSelect, adjustTextareaHeight } = useEmojiPicker(message, setMessage, inputRef);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight(e.target);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (isSending || !message.trim() && attachments.length === 0) return;
    
    if (!isSubscribed || !isOnline) {
      toast({
        title: "Connexion perdue",
        description: "Impossible d'envoyer votre message. Vérifiez votre connexion.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSending(true);
      await onSendMessage();
      
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre message. Réessayez plus tard.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const canSendMessage = !!message.trim() || attachments.length > 0;
  const isDisabled = isSending || isLoading || !isSubscribed || !isOnline || !canSendMessage;

  return (
    <div className="p-4 border-t bg-background">
      <ChatConnectionWarning isSubscribed={isSubscribed} />
      <ChatReplyIndicator replyTo={replyTo} setReplyTo={setReplyTo} />
      <ChatAttachmentsPreview 
        attachments={attachments}
        handleRemoveAttachment={handleRemoveAttachment}
      />
      
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message..."
            className="min-h-10 resize-none pr-12 pt-2.5 pb-2.5"
            disabled={isSending || isLoading}
            rows={1}
          />
          
          <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                >
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" side="top" align="end">
                <Picker
                  data={data}
                  onEmojiSelect={handleEmojiSelect}
                  locale="fr"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isLoading}
            className="h-9 w-9 rounded-full"
            title="Joindre des fichiers"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Button
            type="button"
            onClick={handleSend}
            disabled={isDisabled}
            className={`ml-1 h-9 w-9 rounded-full ${isSending ? 'opacity-50' : ''}`}
            title="Envoyer"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <ChatSendingStatus isSending={isSending} />
    </div>
  );
};
