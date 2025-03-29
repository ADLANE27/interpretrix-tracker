
export interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  channel_id: string;
  parent_message_id?: string;
  attachments?: Attachment[];
  is_system_message?: boolean;
  mentions?: string[];
  sender: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  reactions?: MessageReaction[];
  reply_count?: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  thumbnail_url?: string;
  size?: number;
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
    email?: string;
    status?: 'available' | 'busy' | 'pause' | 'unavailable';
  };
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  created_at: string;
  created_by: string;
  last_message_at?: string;
  last_message?: string;
  unread_count?: number;
  members_count?: number;
  type?: 'channel' | 'direct';
  members?: ChannelMember[];
}
