export interface User {
  id: string;
  email: string;
  raw_user_meta_data: {
    first_name: string;
    last_name: string;
  };
}

export interface MessageMention {
  id: string;
  mentioned_user_id: string;
  mentioned_user: User;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  channel_id: string;
  sender: User;
  mentions: MessageMention[];
}

export interface PresenceState {
  [key: string]: {
    online_at: string;
    user_id: string;
  }[];
}