
import React, { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const commonEmojis = ['👍', '❤️', '😊', '🎉', '👏', '🙌', '🔥', '✅'];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  size?: 'sm' | 'md';
}

export const EmojiPicker = ({ onEmojiSelect, size = 'md' }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
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
        <div className="flex flex-wrap gap-2 max-w-[240px]">
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
      </PopoverContent>
    </Popover>
  );
};
