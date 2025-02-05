import { z } from "zod";

export const AttachmentSchema = z.object({
  url: z.string().url(),
  filename: z.string(),
  type: z.string(),
  size: z.number()
});

export type Attachment = z.infer<typeof AttachmentSchema>;

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
  reactions: z.record(z.array(z.string())).default({}),
  attachments: z.array(AttachmentSchema).default([])
});

export type Message = z.infer<typeof MessageSchema>;

// Type guard for attachments
export const isAttachment = (value: unknown): value is Attachment => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'url' in value &&
    'filename' in value &&
    'type' in value &&
    'size' in value &&
    typeof (value as any).url === 'string' &&
    typeof (value as any).filename === 'string' &&
    typeof (value as any).type === 'string' &&
    typeof (value as any).size === 'number'
  );
};

export interface MessageData {
  id: string;
  content: string;
  sender_id: string;
  channel_id: string;
  created_at: string;
  parent_message_id: string | null;
  reactions: unknown;
  attachments?: unknown[];
  sender?: {
    id: string;
    email?: string;
    raw_user_meta_data?: Record<string, any>;
  } | null;
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