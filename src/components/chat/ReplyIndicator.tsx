
import React from 'react';
import { Button } from "@/components/ui/button";
import { Message } from "@/types/messaging";

interface ReplyIndicatorProps {
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
}

export const ReplyIndicator: React.FC<ReplyIndicatorProps> = ({ replyTo, setReplyTo }) => {
  if (!replyTo) return null;

  return (
    <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-300">
      <span className="truncate flex-1">En réponse à : {replyTo.sender.name}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setReplyTo(null)}
        className="h-6 px-2 text-xs hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        Annuler
      </Button>
    </div>
  );
};
