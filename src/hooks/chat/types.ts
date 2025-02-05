import { Message, MessageData, Attachment } from '@/types/messaging';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isSubscribed: boolean;
  currentUserId: string | null;
  retryCount: number;
}

export interface ChatActions {
  sendMessage: (content: string, parentMessageId?: string, attachments?: Attachment[]) => Promise<string>;
  deleteMessage: (messageId: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
}

export interface MessageFormatter {
  formatMessage: (messageData: MessageData) => Promise<Message | null>;
}

export interface SubscriptionHandlers {
  handleSubscriptionError: () => void;
  subscribeToMessages: () => RealtimeChannel;
  subscribeToMentions: () => RealtimeChannel;
}