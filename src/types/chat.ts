export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  timestamp: Date;
  parent_message_id?: string;
  reactions?: Record<string, string[]>;
  attachments?: Array<{
    url: string;
    filename: string;
    type: string;
    size: number;
  }>;
}