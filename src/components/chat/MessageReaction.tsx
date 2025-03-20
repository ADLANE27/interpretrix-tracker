
import React, { useState } from 'react';
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
  const [isReacting, setIsReacting] = useState(false);
  
  const handleEmojiSelect = async (emoji: string) => {
    if (isReacting) return;
    
    try {
      setIsReacting(true);
      await onReactToMessage(messageId, emoji);
    } catch (error) {
      console.error('[MessageReaction] Failed to add reaction:', error);
    } finally {
      setIsReacting(false);
    }
  };

  // Create an array of emoji reactions for rendering
  const reactionEmojis = Object.entries(reactions || {})
    .filter(([_, users]) => users && users.length > 0)
    .map(([emoji, users]) => ({
      emoji,
      count: users.length,
      hasReacted: currentUserId ? users.includes(currentUserId) : false
    }));

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactionEmojis.map(({ emoji, count, hasReacted }) => (
        <Button
          key={emoji}
          variant="ghost"
          size="sm"
          disabled={isReacting}
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
