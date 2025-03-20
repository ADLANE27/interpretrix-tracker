import React, { useState, useEffect } from 'react';
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
  const [localReactions, setLocalReactions] = useState<Record<string, string[]>>(reactions || {});
  
  // Update local reactions when props change
  useEffect(() => {
    console.log(`[MessageReaction] Updating local reactions for message ${messageId}:`, reactions);
    setLocalReactions(reactions || {});
  }, [reactions, messageId]);
  
  const handleEmojiSelect = async (emoji: string) => {
    if (isReacting || !currentUserId) return;
    
    try {
      setIsReacting(true);
      console.log(`[MessageReaction] Adding reaction ${emoji} to message ${messageId}`);
      
      // Optimistic UI update
      const updatedReactions = { ...localReactions };
      
      // If emoji exists and user has already used it, remove it
      if (updatedReactions[emoji] && updatedReactions[emoji].includes(currentUserId)) {
        updatedReactions[emoji] = updatedReactions[emoji].filter(id => id !== currentUserId);
        if (updatedReactions[emoji].length === 0) {
          delete updatedReactions[emoji];
        }
      } else {
        // Otherwise, add reaction
        if (!updatedReactions[emoji]) {
          updatedReactions[emoji] = [];
        }
        updatedReactions[emoji] = [...updatedReactions[emoji], currentUserId];
      }
      
      setLocalReactions(updatedReactions);
      
      // Call API to update reactions
      await onReactToMessage(messageId, emoji);
      
    } catch (error) {
      console.error('[MessageReaction] Failed to add reaction:', error);
      // If error, revert to original reactions
      setLocalReactions(reactions || {});
    } finally {
      setIsReacting(false);
    }
  };

  // Create array of reactions for display
  const reactionEmojis = Object.entries(localReactions)
    .filter(([_, users]) => users && users.length > 0)
    .map(([emoji, users]) => ({
      emoji,
      count: users.length,
      hasReacted: currentUserId ? users.includes(currentUserId) : false
    }));
  
  console.log(`[MessageReaction] Processed reactions for message ${messageId}:`, reactionEmojis);

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
