import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaperClip, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmojiPicker from './EmojiPicker';
import { useToast } from '../ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UploadDropzone } from './UploadDropzone';
import { Mention, MentionSuggestions } from './MentionSuggestions';
import { useUnreadMentions } from '@/hooks/chat/useUnreadMentions';
import { useMentionSuggestions } from '@/hooks/chat/useMentionSuggestions';
import { LanguageSuggestion, MemberSuggestion, Suggestion } from '@/types/chat';

interface ChatInputProps {
  channelId: string;
  sendMessage: (content: string, attachments?: any[]) => Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const ChatInput = ({
  channelId,
  sendMessage,
  placeholder = 'Type a message',
  className,
  disabled = false,
}: ChatInputProps) => {
  const [messageContent, setMessageContent] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { markMentionsAsRead } = useUnreadMentions(channelId);
  const { suggestions, loading, fetchSuggestions, resetSuggestions } = useMentionSuggestions(channelId);

  const uploadAttachments = async (files: File[]) => {
    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .upload(`${channelId}/${Date.now()}-${file.name}`, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Error uploading file:', error);
          toast({
            title: 'Upload error',
            description: `Failed to upload ${file.name}: ${error.message}`,
            variant: 'destructive',
          });
          return null;
        }

        const attachmentUrl = `${supabase.supabaseUrl}/storage/v1/object/public/${data.Key}`;
        return {
          name: file.name,
          url: attachmentUrl,
          size: file.size,
          type: file.type,
        };
      });

      const uploadedAttachments = (await Promise.all(uploadPromises)).filter(Boolean);
      setAttachments((prevAttachments) => [...prevAttachments, ...uploadedAttachments]);
      toast({
        title: 'Files uploaded',
        description: `Successfully uploaded ${uploadedAttachments.length} file(s).`,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset the file input
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (disabled) {
      toast({
        title: 'Cannot send message',
        description: 'This action is currently disabled.',
        variant: 'destructive',
      });
      return;
    }

    if (!messageContent.trim() && attachments.length === 0) {
      toast({
        title: 'Cannot send message',
        description: 'Message cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendMessage(messageContent, attachments);
      setMessageContent('');
      setAttachments([]);
      markMentionsAsRead();
      toast({
        title: 'Message sent',
        description: 'Your message has been sent successfully.',
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send message',
        description: error.message || 'An error occurred while sending the message.',
        variant: 'destructive',
      });
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageContent((prevContent) => prevContent + emoji);
    setIsEmojiPickerOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setMessageContent(inputValue);

    // Check for mention pattern
    const mentionMatch = inputValue.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      const cursorPosition = e.target.selectionStart || 0;
      
      // Calculate position for the suggestions
      if (inputRef.current) {
        const input = inputRef.current;
        const inputRect = input.getBoundingClientRect();
        const caretPos = getCaretCoordinates(input, input.selectionStart || 0);
        
        setMentionPosition({
          top: inputRect.top - 180, // Position above the input
          left: inputRect.left + caretPos.left,
        });
      }
      
      // Show suggestions
      setShowMentionSuggestions(true);
      fetchSuggestions(query);
    } else {
      setShowMentionSuggestions(false);
      resetSuggestions();
    }
  }, [fetchSuggestions, resetSuggestions]);

  // Helper function to get caret coordinates
  function getCaretCoordinates(element: HTMLInputElement, position: number) {
    let debug = false;

    if (debug) {
      console.group("getCaretCoordinates");
    }

    // mirrored heavily from
    // https://github.com/component/textarea-caret-position
    // license MIT
    let properties = [
      'direction',  // RTL support
      'boxSizing',
      'width',  // on Chrome and IE, exclude the scrollbar, so the mirror is the same width as the textarea
      'height',
      'overflowX',
      'overflowY',  // copy the scrollbar for textarea
      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'borderStyle',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      // https://developer.mozilla.org/en-US/docs/Web/CSS/font
      'fontStyle',
      'fontVariant',
      'fontWeight',
      'fontStretch',
      'fontSize',
      'fontSizeAdjust',
      'lineHeight',
      'fontFamily',
      'textAlign',
      'textTransform',
      'textIndent',
      'letterSpacing',
      'wordSpacing',

      'tabSize',
      'MozTabSize'
    ];

    let isBrowser = typeof window !== 'undefined';
    if (!isBrowser) {
      return { top: 0, left: 0 };
    }

    let div = document.createElement('div');
    div.id = 'input-textarea-caret-position-mirror-div';
    document.body.appendChild(div);

    let style = div.style;
    let computed = window.getComputedStyle(element);

    style.whiteSpace = 'pre-wrap';
    if (element.nodeName === 'INPUT')
      style.wordWrap = 'break-word';  // only for textarea-s

    // position off-screen
    style.position = 'absolute';  // required to return pixels
    style.top = '0px';  // required to return pixels
    style.left = '0px';  // required to return pixels
    style.visibility = 'hidden';  // not 'display: none' because we want rendering

    properties.forEach(function (prop) {
      style[prop] = computed[prop];
    });

    style.overflow = 'hidden';  // for Chrome to not render a scrollbar; the text-area is never wider as the text;
    div.textContent = element.value.substring(0, position);
    if (debug) {
      console.log(`textContent: ${div.textContent}`);
    }
    // the second special handling for input type="text" vs textarea:
    // input does not wrap words. Because text overflows,
    // browsers push the element outside the right edge of the text-area.
    // Same to the bottom if direction is rtl.
    // So the content is not visible.
    let isInput = element.nodeName === 'INPUT';
    if (isInput) {
      style.overflow = 'hidden';// for Chrome to not render a scrollbar; the text-area is never wider as the text;
    }

    let span = document.createElement('span');
    // Wrapping must be replicated *exactly*, including when a long word is hyphenated.
    //  <https://github.com/component/textarea-caret-position/blob/master/index.js#L41>
    span.textContent = element.value.substring(position) || '.';  // || because a completely empty span doesn't have a height/width
    div.appendChild(span);

    let coordinates = {
      top: span.offsetTop + parseInt(computed['borderTopWidth']),
      left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
    };

    if (debug) {
      console.log(`Coordinates: top=${coordinates.top}, left=${coordinates.left}`);
      console.groupEnd();
    }
    document.body.removeChild(div);
    return coordinates;
  }

  const isMemberSuggestion = (suggestion: Suggestion): suggestion is MemberSuggestion => {
    return (suggestion as MemberSuggestion).role !== undefined;
  };

  const isLanguageSuggestion = (suggestion: Suggestion): suggestion is LanguageSuggestion => {
    return (suggestion as LanguageSuggestion).languageName !== undefined;
  };

  const handleMentionSelect = (suggestion: Suggestion) => {
    console.log('Selected suggestion:', suggestion);
    
    // Get the current cursor position
    const cursorPosition = inputRef.current?.selectionStart || 0;
    
    // Find the position of the @ symbol that started this mention
    const textBeforeCursor = messageContent.substring(0, cursorPosition);
    const lastAtSymbolPos = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbolPos !== -1) {
      // Remove the partial mention (from @ to the cursor)
      const newContent = messageContent.substring(0, lastAtSymbolPos);
      
      // Format the mention based on suggestion type
      let mentionText = '';
      
      if (isMemberSuggestion(suggestion)) {
        // If it's an admin, use the @admin: prefix format
        if (suggestion.role === 'admin') {
          mentionText = `@admin:${suggestion.name} `;
          console.log('Adding admin mention with prefix:', mentionText);
        } else {
          // For interpreters, use the standard @Name format
          mentionText = `@${suggestion.name} `;
          console.log('Adding interpreter mention:', mentionText);
        }
      } else if (isLanguageSuggestion(suggestion)) {
        // For languages, use the standard @Language format
        mentionText = `@${suggestion.languageName} `;
        console.log('Adding language mention:', mentionText);
      }
      
      // Add the rest of the content after the cursor
      const restOfContent = messageContent.substring(cursorPosition);
      
      // Set the new content with the properly formatted mention
      setMessageContent(newContent + mentionText + restOfContent);
      
      // Hide suggestions
      setShowMentionSuggestions(false);
      resetSuggestions();
      
      // Focus the input and place cursor after the mention
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newCursorPos = lastAtSymbolPos + mentionText.length;
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage(event as any);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSendMessage]);

  return (
    <div className={cn("relative", className)}>
      <form onSubmit={handleSendMessage} className="relative rounded-lg border border-input shadow-sm">
        <div className="relative flex items-center space-x-2 p-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            className="shrink-0"
          >
            <Globe2 />
            <span className="sr-only">Toggle emoji picker</span>
          </Button>
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={messageContent}
            onChange={handleInputChange}
            className="flex-1 rounded-l-none border-0 bg-transparent shadow-none focus-visible:outline-none focus-visible:ring-0"
            disabled={disabled || uploading}
          />
          <UploadDropzone
            onUpload={uploadAttachments}
            uploading={uploading}
            setUploading={setUploading}
          />
          <input
            type="file"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                uploadAttachments(Array.from(e.target.files));
              }
            }}
            className="hidden"
            ref={fileInputRef}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <PaperClip className="h-4 w-4" />
            <span className="sr-only">Attach file</span>
          </Button>
          <Button
            type="submit"
            size="icon"
            disabled={disabled || uploading}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </form>
      {isEmojiPickerOpen && (
        <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setIsEmojiPickerOpen(false)} />
      )}
      {showMentionSuggestions && (
        <MentionSuggestions
          suggestions={suggestions}
          loading={loading}
          onSelect={handleMentionSelect}
          position={mentionPosition}
        />
      )}
    </div>
  );
};

// Helper function to get caret coordinates
function getCaretCoordinates(element: HTMLInputElement, position: number) {
  let debug = false;

  if (debug) {
    console.group("getCaretCoordinates");
  }

  // mirrored heavily from
  // https://github.com/component/textarea-caret-position
  // license MIT
  let properties = [
    'direction',  // RTL support
    'boxSizing',
    'width',  // on Chrome and IE, exclude the scrollbar, so the mirror is the same width as the textarea
    'height',
    'overflowX',
    'overflowY',  // copy the scrollbar for textarea
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    // https://developer.mozilla.org/en-US/docs/Web/CSS/font
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'letterSpacing',
    'wordSpacing',

    'tabSize',
    'MozTabSize'
  ];

  let isBrowser = typeof window !== 'undefined';
  if (!isBrowser) {
    return { top: 0, left: 0 };
  }

  let div = document.createElement('div');
  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  let style = div.style;
  let computed = window.getComputedStyle(element);

  style.whiteSpace = 'pre-wrap';
  if (element.nodeName === 'INPUT')
    style.wordWrap = 'break-word';  // only for textarea-s

  // position off-screen
  style.position = 'absolute';  // required to return pixels
  style.top = '0px';  // required to return pixels
  style.left = '0px';  // required to return pixels
  style.visibility = 'hidden';  // not 'display: none' because we want rendering

  properties.forEach(function (prop) {
    style[prop] = computed[prop];
  });

  style.overflow = 'hidden';  // for Chrome to not render a scrollbar; the text-area is never wider as the text;
  div.textContent = element.value.substring(0, position);
  if (debug) {
    console.log(`textContent: ${div.textContent}`);
  }
  // the second special handling for input type="text" vs textarea:
  // input does not wrap words. Because text overflows,
  // browsers push the element outside the right edge of the text-area.
  // Same to the bottom if direction is rtl.
  // So the content is not visible.
  let isInput = element.nodeName === 'INPUT';
  if (isInput) {
    style.overflow = 'hidden';// for Chrome to not render a scrollbar; the text-area is never wider as the text;
  }

  let span = document.createElement('span');
  // Wrapping must be replicated *exactly*, including when a long word is hyphenated.
  //  <https://github.com/component/textarea-caret-position/blob/master/index.js#L41>
  span.textContent = element.value.substring(position) || '.';  // || because a completely empty span doesn't have a height/width
  div.appendChild(span);

  let coordinates = {
    top: span.offsetTop + parseInt(computed['borderTopWidth']),
    left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
  };

  if (debug) {
    console.log(`Coordinates: top=${coordinates.top}, left=${coordinates.left}`);
    console.groupEnd();
  }
  document.body.removeChild(div);
  return coordinates;
}
