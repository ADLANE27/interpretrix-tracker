
import { Message } from "@/types/messaging";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isSubscribed: boolean;
  currentUserId: string | null;
  hasMoreMessages: boolean;
}

export interface SubscriptionState {
  isSubscribed: boolean;
  lastEventTimestamp: Date | null;
  messagesSubscription: RealtimeChannel | null;
  mentionsSubscription: RealtimeChannel | null;
}

export interface MessageMapRef {
  current: Map<string, Message>;
}

export type ChatChannelType = 'group' | 'direct';

export interface RealtimeMessageHandler {
  (payload: any): Promise<void>;
}
