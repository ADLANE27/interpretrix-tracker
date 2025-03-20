
import React from 'react';
import { Badge } from "@/components/ui/badge";

interface MessageReactionProps {
  emoji: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

export const MessageReaction = ({ emoji, count, isActive, onClick }: MessageReactionProps) => {
  return (
    <Badge
      variant="outline"
      className={`px-2 py-1 rounded-full cursor-pointer hover:bg-gray-100 transition-colors ${
        isActive ? 'bg-gray-100 border-gray-300' : 'bg-white'
      }`}
      onClick={onClick}
    >
      <span className="mr-1">{emoji}</span>
      <span className="text-xs font-medium">{count}</span>
    </Badge>
  );
};
