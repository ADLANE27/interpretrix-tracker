
import React, { useRef, useState, KeyboardEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, Smile, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MessageAttachmentPreview } from './MessageAttachmentPreview';
import { Message } from '@/types/messaging';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const { toast } = useToast();
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustHeight(e.target);
  };

  const adjustHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (isSending || !message.trim() && attachments.length === 0) return;
    
    if (!isSubscribed) {
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

  const handleEmojiSelect = (emoji: any) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      const text = inputRef.current.value;
      const newText = text.substring(0, start) + emoji.native + text.substring(end);
      setMessage(newText);
      
      // Set cursor position after the inserted emoji
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newPosition = start + emoji.native.length;
          inputRef.current.selectionStart = newPosition;
          inputRef.current.selectionEnd = newPosition;
          adjustHeight(inputRef.current);
        }
      }, 10);
    } else {
      setMessage((prev) => prev + emoji.native);
    }
  };

  return (
    <div className="p-4 border-t bg-background">
      {/* Connection warning */}
      {!isSubscribed && (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Connexion perdue. Vos messages ne seront pas envoyés. Tentative de reconnexion...
          </AlertDescription>
        </Alert>
      )}
      
      {/* Reply-to indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-accent/50 rounded-lg">
          <span className="text-sm text-muted-foreground truncate flex-1">
            Réponse à : {replyTo.sender.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyTo(null)}
            className="h-6 px-2 text-xs"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Annuler
          </Button>
        </div>
      )}
      
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center">
              <MessageAttachmentPreview 
                file={file} 
                onDelete={() => handleRemoveAttachment(index)}
              />
            </div>
          ))}
        </div>
      )}
      
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
            disabled={(!message.trim() && attachments.length === 0) || isSending || isLoading || !isSubscribed}
            className={`ml-1 h-9 w-9 rounded-full ${isSending ? 'opacity-50' : ''}`}
            title="Envoyer"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div className="mt-1.5 flex justify-end">
        {isSending && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Envoi...
          </Badge>
        )}
      </div>
    </div>
  );
};
