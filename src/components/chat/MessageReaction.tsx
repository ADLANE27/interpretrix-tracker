
import React from 'react';
import { Badge } from "@/components/ui/badge";

interface MessageReactionProps {
  emoji: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

export const MessageReaction = ({ emoji, count, isActive, onClick }: MessageReactionProps) => {
  // Handler to ensure click event is properly captured and propagated
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[MessageReaction] Reaction clicked, calling onClick handler');
    onClick();
  };

  return (
    <Badge
      variant="outline"
      className={`px-2 py-1 rounded-full cursor-pointer hover:bg-gray-100 transition-colors flex items-center ${
        isActive ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
      }`}
      onClick={handleClick}
    >
      <span className="mr-1 text-base">{emoji}</span>
      <span className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>{count}</span>
    </Badge>
  );
};
