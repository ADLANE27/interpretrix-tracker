
import React from 'react';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Message } from '@/types/messaging';

interface ChatReplyIndicatorProps {
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
}

export const ChatReplyIndicator: React.FC<ChatReplyIndicatorProps> = ({
  replyTo,
  setReplyTo
}) => {
  if (!replyTo) return null;
  
  return (
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
  );
};
