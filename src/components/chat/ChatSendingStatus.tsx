
import React from 'react';
import { Badge } from "@/components/ui/badge";

interface ChatSendingStatusProps {
  isSending: boolean;
}

export const ChatSendingStatus: React.FC<ChatSendingStatusProps> = ({
  isSending
}) => {
  if (!isSending) return null;

  return (
    <div className="mt-1.5 flex justify-end">
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Envoi...
      </Badge>
    </div>
  );
};
