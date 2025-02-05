import { z } from "zod";

export const AttachmentSchema = z.object({
  url: z.string().url(),
  filename: z.string(),
  type: z.string(),
  size: z.number()
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  sender: z.object({
    id: z.string().uuid(),
    name: z.string(),
    avatarUrl: z.string().url().optional()
  }),
  timestamp: z.date(),
  parent_message_id: z.string().uuid().optional().nullable(),
  reactions: z.record(z.array(z.string())).optional().default({}),
  attachments: z.array(AttachmentSchema).optional().default([])
});

export type Message = z.infer<typeof MessageSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;

export interface MessageData {
  id: string;
  content: string;
  sender_id: string;
  channel_id: string;
  created_at: string;
  parent_message_id: string | null;
  reactions: Record<string, string[]>;
  attachments?: Array<{
    url: string;
    filename: string;
    type: string;
    size: number;
  }>;
  sender?: {
    id: string;
    email?: string;
    raw_user_meta_data?: Record<string, any>;
  };
}

export interface ReplyToMessage {
  id: string;
  content: string;
  sender: {
    name: string;
  };
}

export interface ChannelMember {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'interpreter';
}

export interface MessageComposerProps {
  onSendMessage: (content: string, parentMessageId?: string) => Promise<string>;
  isLoading?: boolean;
  replyTo?: ReplyToMessage;
  onCancelReply?: () => void;
  channelId: string;
  currentUserId: string | null;
}

export interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
}
