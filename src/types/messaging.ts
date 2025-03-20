import type { Json } from '@/integrations/supabase/types';

export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  timestamp: Date;
  parent_message_id?: string | null;
  attachments?: Attachment[];
  channelType?: 'group' | 'direct';
  reactions: Record<string, string[]>;
}

export interface MessageData {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  parent_message_id?: string | null;
  reactions?: Record<string, string[]> | string;
  attachments?: Array<{
    url: string;
    filename: string;
    type: string;
    size: number;
  }>;
}

export interface Attachment {
  url: string;
  filename: string;
  type: string;
  size: number;
}

export interface ChannelMember {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  joined_at: string;
}

export function isAttachment(obj: any): obj is Attachment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.url === 'string' &&
    typeof obj.filename === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.size === 'number'
  );
}

export interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  replyTo?: Message | null;
  setReplyTo?: (message: Message | null) => void;
  channelId: string;
}

// Add dedicated mention interfaces
export interface MemberSuggestion {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'interpreter';
  avatarUrl?: string;
}

export interface LanguageSuggestion {
  name: string;
  type: 'language';
}

export type Suggestion = MemberSuggestion | LanguageSuggestion;
