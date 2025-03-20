
import { Message } from "@/types/messaging";
import { ReactNode } from "react";

export type ChatChannelType = 'group' | 'direct';

export interface MessageMapRef {
  current: Map<string, Message>;
}

export interface SubscriptionState {
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CHANNEL_ERROR' | 'SUBSCRIPTION_ERROR' | 'CLOSED' | 'CONNECTING';
  lastUpdated: Date;
  error?: any;
}

export interface SubscriptionStates {
  messages: SubscriptionState;
  messageDeletes: SubscriptionState;
  messageEdits: SubscriptionState;
}

export interface AttachmentItem {
  file: File;
  preview: string;
  uploading: boolean;
  error?: string;
  progress?: number;
}

export interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSendMessage: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
  handleRemoveAttachment: (index: number) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
}

export interface MessageItemProps {
  message: Message;
  isCurrentUser: boolean;
  onDeleteMessage?: (messageId: string) => void;
  showThread?: boolean;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  replyTo?: Message | null;
  setReplyTo?: (message: Message | null) => void;
  currentUserId: string | null;
  channelId: string;
}

export interface ChatProps {
  channelId: string;
  userRole?: 'admin' | 'interpreter';
  children?: ReactNode;
}

export interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => Promise<void>;
  replyTo?: Message | null;
  setReplyTo?: (message: Message | null) => void;
  channelId: string;
}

export interface ChannelMembersPopoverProps {
  channelId: string;
  channelName: string;
  channelType: 'group' | 'direct';
  userRole?: 'admin' | 'interpreter';
}

export interface MessageReactionProps {
  messageId: string;
  reactions?: Record<string, string[]>;
  currentUserId: string | null;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
}
