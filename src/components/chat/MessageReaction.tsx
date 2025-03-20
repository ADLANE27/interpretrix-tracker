
import React from 'react';
import { EmojiPicker } from './EmojiPicker';
import { Button } from "@/components/ui/button";

interface MessageReactionProps {
  messageId: string;
  reactions?: Record<string, string[]>;
  currentUserId: string | null;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
}

export const MessageReaction = ({ 
  messageId, 
  reactions = {}, 
  currentUserId, 
  onReactToMessage 
}: MessageReactionProps) => {
  const handleEmojiSelect = async (emoji: string) => {
    try {
      await onReactToMessage(messageId, emoji);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const getReactionCount = (emoji: string) => {
    return reactions[emoji]?.length || 0;
  };

  const hasUserReacted = (emoji: string) => {
    return currentUserId ? reactions[emoji]?.includes(currentUserId) : false;
  };

  // Convertir l'objet reactions en array pour affichage
  const reactionItems = Object.entries(reactions || {}).map(([emoji, users]) => ({
    emoji,
    count: users.length,
    hasReacted: hasUserReacted(emoji)
  })).filter(item => item.count > 0);

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactionItems.map(({ emoji, count, hasReacted }) => (
        <Button
          key={emoji}
          variant="ghost"
          size="sm"
          onClick={() => handleEmojiSelect(emoji)}
          className={`px-2 py-0.5 h-auto rounded-full text-xs ${
            hasReacted ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <span className="mr-1">{emoji}</span>
          <span>{count}</span>
        </Button>
      ))}
      <EmojiPicker onEmojiSelect={handleEmojiSelect} size="sm" />
    </div>
  );
};
