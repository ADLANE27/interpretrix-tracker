
export interface TerminologyChat {
  id: string;
  user_id: string;
  source_language: string;
  target_language: string;
  title: string;
  created_at: string;
  updated_at?: string;
}

export interface TerminologyChatMessage {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface TerminologyChatRequest {
  message: string;
  sourceLanguage: string;
  targetLanguage: string;
  userId: string;
  conversationId?: string;
  previousMessages?: { role: 'user' | 'assistant', content: string }[];
}

export interface TerminologyChatResponse {
  chatId: string;
  message: string;
  isNewChat: boolean;
  error?: string;
}
