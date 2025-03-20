
import React, { useState } from 'react';
import { SmilePlus, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

// Updated list of most common emojis for chat reactions
const commonEmojis = ['👍', '❤️', '😂', '🔥', '👏', '😍', '🙏', '👌', '💯', '😊', '🎉', '✅', '👀', '🤔'];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  size?: 'sm' | 'md';
}

export const EmojiPicker = ({ onEmojiSelect, size = 'md' }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
    setShowFullPicker(false);
  };

  const handleEmojiSelect = (emoji: any) => {
    // Make sure we're getting the native emoji character
    onEmojiSelect(emoji.native);
    setOpen(false);
    setShowFullPicker(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size={size === 'sm' ? 'sm' : 'default'} 
          className={`p-1 rounded-full hover:bg-gray-100 bg-white/90 shadow-sm h-auto ${
            size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'
          }`}
          aria-label="Add reaction"
        >
          <SmilePlus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        {!showFullPicker ? (
          <>
            <div className="flex flex-wrap gap-2 max-w-[280px] mb-2">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-xl hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs mt-1 text-gray-500"
              onClick={() => setShowFullPicker(true)}
            >
              <Search className="h-3.5 w-3.5 mr-1" />
              Search all emojis
            </Button>
          </>
        ) : (
          <div className="w-[300px]">
            <Picker 
              data={data} 
              onEmojiSelect={handleEmojiSelect}
              theme="light"
              locale="fr"
              previewPosition="none"
              skinTonePosition="none"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
