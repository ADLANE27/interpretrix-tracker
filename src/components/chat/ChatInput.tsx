
import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Message } from "@/types/messaging";

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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-t p-4">
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
          <span>Replying to: {replyTo.sender.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyTo(null)}
          >
            Cancel
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 min-h-[40px] p-2 border rounded-md resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          Attach
        </Button>
        <Button onClick={onSendMessage}>Send</Button>
      </div>
      {attachments.length > 0 && (
        <div className="mt-2 space-y-1">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveAttachment(index)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
