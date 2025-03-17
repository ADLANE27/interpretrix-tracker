
import { useRef } from 'react';

export const useEmojiPicker = (
  message: string, 
  setMessage: (message: string) => void,
  inputRef: React.RefObject<HTMLTextAreaElement>
) => {
  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  };

  const handleEmojiSelect = (emoji: any) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      const text = inputRef.current.value;
      const newText = text.substring(0, start) + emoji.native + text.substring(end);
      
      // Fix: Use the string directly instead of a function
      setMessage(newText);
      
      // Set cursor position after the inserted emoji
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newPosition = start + emoji.native.length;
          inputRef.current.selectionStart = newPosition;
          inputRef.current.selectionEnd = newPosition;
          adjustTextareaHeight(inputRef.current);
        }
      }, 10);
    } else {
      // If no ref, simply append the emoji
      setMessage(message + emoji.native);
    }
  };

  return {
    handleEmojiSelect,
    adjustTextareaHeight
  };
};
