
import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Message } from "@/types/messaging";
import { Send, AtSign } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { MentionSuggestions } from './MentionSuggestions';
import { EmojiPicker } from './EmojiPicker';
import { AttachmentManager } from './AttachmentManager';
import { ReplyIndicator } from './ReplyIndicator';
import { useMentionManager } from '@/hooks/chat/useMentionManager';

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSendMessage: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
  handleRemoveAttachment: (index: number) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
  style?: React.CSSProperties;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  message,
  setMessage,
  onSendMessage,
  handleFileChange,
  attachments,
  handleRemoveAttachment,
  inputRef,
  replyTo,
  setReplyTo,
  style,
}) => {
  const {
    mentionSuggestionsVisible,
    mentionSearchTerm,
    suggestions,
    isLoadingSuggestions,
    checkForMentions,
    handleMentionSelect,
    triggerMention,
    setCursorPosition
  } = useMentionManager(inputRef);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    checkForMentions(newMessage, cursorPos);
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage(message + emoji.native);
  };

  const handleMentionSelection = (suggestion: any) => {
    handleMentionSelect(suggestion, message, setMessage);
  };

  return (
    <div className="p-3 bg-white dark:bg-gray-900" style={style}>
      <ReplyIndicator replyTo={replyTo} setReplyTo={setReplyTo} />
      
      <div className="relative">
        <div className="flex items-end rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 shadow-sm focus-within:ring-1 focus-within:ring-purple-500 focus-within:border-purple-500">
          <div className="flex-1 min-h-[40px] flex items-end">
            <Textarea
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              placeholder="Écrivez un message..."
              className="resize-none border-0 focus-visible:ring-0 shadow-none min-h-[40px] py-2.5 px-3 text-base rounded-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
            />
          </div>
          <div className="flex items-center p-1.5 pr-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-purple-500 rounded-full"
              onClick={() => triggerMention(message, setMessage)}
            >
              <AtSign className="h-5 w-5" />
            </Button>
          
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
            
            <AttachmentManager 
              attachments={attachments}
              handleFileChange={handleFileChange}
              handleRemoveAttachment={handleRemoveAttachment}
            />
            
            <Button
              size="icon"
              className="h-9 w-9 ml-1 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center"
              onClick={onSendMessage}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {mentionSuggestionsVisible && (
          <MentionSuggestions 
            suggestions={suggestions}
            onSelect={handleMentionSelection}
            visible={mentionSuggestionsVisible}
            loading={isLoadingSuggestions}
            searchTerm={mentionSearchTerm}
          />
        )}
      </div>
      
      {attachments.length > 0 && (
        <div className="mt-2 space-y-1.5 px-1">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center gap-2 text-sm py-1.5 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 hover:text-red-500 px-2"
                onClick={() => handleRemoveAttachment(index)}
              >
                Supprimer
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
