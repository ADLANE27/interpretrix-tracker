export interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: 'internal' | 'external' | 'mixed' | 'admin_only';
  members_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  channel_id?: string | null;
  recipient_id: string | null;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  mentions?: { mentioned_user_id: string }[];
}

export interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  isAdmin: boolean;
}

export interface ChatHistory {
  id: string;
  name: string;
  lastMessage?: string;
  unreadCount: number;
  isAdmin?: boolean;
}