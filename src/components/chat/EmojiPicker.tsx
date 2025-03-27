
import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from "@/components/ui/button";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: any) => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect }) => {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  
  const handleSelect = (emoji: any) => {
    onEmojiSelect(emoji);
    setEmojiPickerOpen(false);
  };
  
  return (
    <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-purple-500 rounded-full"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        side="top" 
        align="end"
      >
        <Picker
          data={data}
          onEmojiSelect={handleSelect}
          theme="light"
          locale="fr"
          previewPosition="none"
          skinTonePosition="none"
          categories={[
            'frequent',
            'people',
            'nature',
            'foods',
            'activity',
            'places',
            'objects',
            'symbols',
            'flags'
          ]}
        />
      </PopoverContent>
    </Popover>
  );
};
