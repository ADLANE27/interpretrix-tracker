
export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  status: string;
  user_agent?: string;
  subscription_data?: any;
  last_notification_at?: string;
  notification_count?: number;
  failed_count?: number;
  last_used_at?: string;
}

export interface QueuedNotification {
  id: string;
  recipient_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: number;
  status: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
  scheduled_for?: string;
  processed_at?: string;
  error_message?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: string;
  priority?: number;
}

export interface NotificationMetrics {
  total_processed: number;
  successful: number;
  failed: number;
  retry_count: number;
  average_processing_time: number;
}
