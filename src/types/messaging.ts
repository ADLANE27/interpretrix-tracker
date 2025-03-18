
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
  created_at?: string;      // Include for compatibility
  sender_id: string;
  channel_id: string;
  parent_message_id?: string | null;
  reactions: Record<string, string[]>;
  attachments?: Attachment[];
  channelType?: 'group' | 'direct';
}

export interface MessageData {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  channel_id: string;
  parent_message_id?: string | null;
  reactions: Record<string, string[]> | Json;
  attachments?: Array<{
    url: string;
    filename: string;
    type: string;
    size: number;
  }> | Json[];
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

// Helper function to validate and convert reactions
export function parseReactions(reactions: any): Record<string, string[]> {
  if (typeof reactions === 'string') {
    try {
      reactions = JSON.parse(reactions);
    } catch (e) {
      return {};
    }
  }
  
  if (typeof reactions !== 'object' || reactions === null) {
    return {};
  }
  
  const result: Record<string, string[]> = {};
  
  Object.entries(reactions).forEach(([emoji, users]) => {
    if (Array.isArray(users) && users.every(u => typeof u === 'string')) {
      result[emoji] = users;
    }
  });
  
  return result;
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
