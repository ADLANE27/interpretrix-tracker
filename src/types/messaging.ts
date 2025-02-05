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
  reactions: z.record(z.array(z.string())).default({}),
  attachments: z.array(AttachmentSchema).default([])
});

export type Message = z.infer<typeof MessageSchema>;

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
  reactions: unknown;
  attachments?: unknown[];
  sender?: {
    id: string;
    email?: string;
    raw_user_meta_data?: Record<string, any>;
  } | null;
}

export interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
}