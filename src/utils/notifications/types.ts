
export interface OneSignalSubscription {
  interpreter_id: string;
  player_id: string;
  platform: string;
  status: 'active' | 'unsubscribed';
  user_agent: string;
  created_at: string;
  updated_at: string;
}

export const ONESIGNAL_APP_ID = "2f15c47a-f369-4206-b077-eaddd8075b04";
