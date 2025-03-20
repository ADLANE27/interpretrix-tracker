
import { Message, MessageData } from '@/types/messaging';
import { ChatChannelType } from './chatHooks';

export interface MessageProcessingState {
  messages: Message[];
  isLoading: boolean;
  hasMoreMessages: boolean;
  lastFetchTimestamp: string | null;
  userRole: string;
  messagesVersion: number;
}

export interface MessageProcessingControls {
  processingMessage: boolean;
  updateScheduled: boolean;
  pendingMessageUpdates: Set<string>;
}

export interface MessageMapManager {
  messagesMap: Map<string, Message>;
  updateMessagesArray: () => void;
  setMessages: (messages: Message[]) => void;
}

export interface MessageProcessorProps {
  channelId: string;
  userRole: string;
  messagesMap: Map<string, Message>;
  pendingMessageUpdates: Set<string>;
  updateMessagesArray: () => void;
}
