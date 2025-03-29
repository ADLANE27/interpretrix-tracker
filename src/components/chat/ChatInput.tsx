
import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, PaperclipIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ChatInputProps {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  onSendMessage: () => Promise<void>;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  selectedFiles?: File[];
  attachments?: File[];
  removeSelectedFile?: (index: number) => void;
  isUploading?: boolean;
  additionActions?: React.ReactNode;
  replyTo?: {
    id: string;
    content: string;
    sender: {
      name: string;
    };
  } | null;
  setReplyTo?: (replyTo: null) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  style?: React.CSSProperties;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  message,
  setMessage,
  onSendMessage,
  handleFileChange,
  placeholder = "Écrivez votre message...",
  selectedFiles,
  removeSelectedFile,
  isUploading,
  additionActions,
  replyTo,
  setReplyTo,
  inputRef: externalInputRef,
  style,
  className
}) => {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalInputRef || internalTextareaRef;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message, textareaRef]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className={`relative ${className || ''}`} style={style}>
      {replyTo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-0 left-0 w-full p-2 bg-secondary rounded-md z-10"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs">
              Répondre à <span className="font-semibold">{replyTo.sender.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setReplyTo!(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs italic">{replyTo.content}</div>
        </motion.div>
      )}
      <div className="flex items-center gap-2 bg-secondary p-3 rounded-lg">
        <Button variant="ghost" size="icon" asChild>
          <label htmlFor="upload-attachment">
            <PaperclipIcon className="h-5 w-5" />
            <input
              type="file"
              id="upload-attachment"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </Button>
        <Textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="resize-none border-none shadow-none focus-visible:ring-0"
        />
        <Button onClick={onSendMessage} disabled={!message.trim() || isUploading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <AnimatePresence>
        {selectedFiles && selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 max-h-24 overflow-y-auto p-2 bg-secondary rounded-md"
          >
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between text-xs py-1">
                <span>{file.name}</span>
                <Button variant="ghost" size="icon" onClick={() => removeSelectedFile!(index)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {additionActions && (
        <div className="absolute right-3 bottom-3">{additionActions}</div>
      )}
    </div>
  );
};
