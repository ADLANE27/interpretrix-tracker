
import React from 'react';

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
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full cursor-pointer transition-colors ${
        isActive ? 'bg-[#333333] text-[#FFD700]' : 'bg-[#222222] text-[#aaadb0] hover:bg-[#333333]'
      }`}
      onClick={handleClick}
    >
      <span className="text-base">{emoji}</span>
      <span className="text-xs font-medium">{count}</span>
    </div>
  );
};
