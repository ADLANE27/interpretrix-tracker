export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  timestamp: Date;
  parent_message_id?: string;
  reactions?: Record<string, string[]>;
  attachments?: Array<{
    url: string;
    filename: string;
    type: string;
    size: number;
  }>;
}

export interface ReplyToMessage {
  id: string;
  content: string;
  sender: {
    name: string;
  };
}

export interface MessageComposerProps {
  onSendMessage: (content: string, parentMessageId?: string, attachments?: any[]) => void;
  isLoading?: boolean;
  replyTo?: ReplyToMessage;
  onCancelReply?: () => void;
  channelId: string; // Add channelId prop
}

export interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
}