
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
  reactions?: Record<string, string[]>;
  attachments?: Attachment[];
  channelType?: 'group' | 'direct';
  channel_id?: string;
  sender_id?: string;
}

export interface MessageData {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  channel_id: string;
  parent_message_id?: string | null;
  reactions: Record<string, string[]>;
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
}

export interface ChannelMember {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  joined_at: string;
}
