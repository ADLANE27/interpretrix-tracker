
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NotificationPayload, PushSubscription, QueuedNotification, NotificationMetrics } from '../types/notification.types';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

class NotificationService {
  private isProcessingQueue = false;
  private processInterval: NodeJS.Timeout | null = null;
  private metrics: NotificationMetrics = {
    total_processed: 0,
    successful: 0,
    failed: 0,
    retry_count: 0,
    average_processing_time: 0,
  };

  async initialize() {
    try {
      // Get active VAPID keys from database
      const { data: vapidKeys, error } = await supabase
        .from('vapid_keys')
        .select('public_key, private_key')
        .eq('is_active', true)
        .eq('status', 'active')
        .single();

      if (error || !vapidKeys) {
        throw new Error('No active VAPID keys found');
      }

      // Configure web-push with VAPID keys
      webpush.setVapidDetails(
        'mailto:contact@your-domain.com',
        vapidKeys.public_key,
        vapidKeys.private_key
      );

      // Start queue processing and cleanup tasks
      this.startQueueProcessing();
      this.startPeriodicCleanup();

      logger.info('Notification service initialized with VAPID keys');
    } catch (error) {
      logger.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  private startQueueProcessing() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }

    this.processInterval = setInterval(() => {
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    }, 5000); // Process queue every 5 seconds
  }

  private startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupOldNotifications();
    }, 24 * 60 * 60 * 1000); // Run cleanup daily
  }

  private async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await supabase
        .from('notification_queue')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString())
        .in('status', ['sent', 'failed']);

      logger.info('Cleaned up old notifications');
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
    }
  }

  private async processQueue() {
    this.isProcessingQueue = true;
    const startTime = Date.now();
    let processedCount = 0;

    try {
      // Get pending notifications from queue
      const { data: notifications, error } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('attempts', 3)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        throw new Error(`Error fetching notifications: ${error.message}`);
      }

      if (!notifications?.length) {
        return;
      }

      logger.info(`Processing ${notifications.length} notifications from queue`);

      // Process each notification
      for (const notification of notifications as QueuedNotification[]) {
        processedCount++;
        try {
          // Get user's subscriptions
          const { data: subscriptions } = await supabase
            .from('web_push_subscriptions')
            .select('*')
            .eq('user_id', notification.recipient_id)
            .eq('status', 'active');

          if (!subscriptions?.length) {
            logger.warn(`No active subscriptions for user ${notification.recipient_id}`);
            await this.markNotificationFailed(notification.id, 'No active subscriptions');
            continue;
          }

          // Try to send to all subscriptions
          const results = await Promise.all(
            subscriptions.map(sub => this.sendToSubscription(sub as PushSubscription, notification))
          );

          // If at least one subscription succeeded, mark as sent
          if (results.some(r => r)) {
            await this.markNotificationSent(notification.id);
            this.metrics.successful++;
          } else {
            await this.markNotificationFailed(notification.id, 'Failed to deliver to any subscription');
            this.metrics.failed++;
          }
        } catch (error: any) {
          logger.error(`Error processing notification ${notification.id}:`, error);
          await this.markNotificationFailed(notification.id, error.message);
          this.metrics.failed++;
        }
      }
    } catch (error) {
      logger.error('Error in queue processing:', error);
    } finally {
      this.isProcessingQueue = false;
      
      // Update metrics
      const processingTime = Date.now() - startTime;
      this.metrics.total_processed += processedCount;
      this.metrics.average_processing_time = 
        (this.metrics.average_processing_time * (this.metrics.total_processed - processedCount) + processingTime) / 
        this.metrics.total_processed;
      
      logger.info('Queue processing metrics:', this.metrics);
    }
  }

  private async sendToSubscription(subscription: PushSubscription, notification: QueuedNotification) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh_key,
          auth: subscription.auth_key,
        },
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify({
          title: notification.title,
          body: notification.body,
          data: notification.data,
          icon: notification.data?.icon,
          badge: notification.data?.badge,
        })
      );

      // Update subscription stats
      await supabase
        .from('web_push_subscriptions')
        .update({
          last_notification_at: new Date().toISOString(),
          notification_count: (subscription.notification_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      return true;
    } catch (error: any) {
      logger.error(`Failed to send notification to subscription ${subscription.id}:`, error);

      if (error.statusCode === 410 || error.code === 'ECONNRESET') {
        // Subscription is expired or invalid
        await supabase
          .from('web_push_subscriptions')
          .update({
            status: 'expired',
            failed_count: (subscription.failed_count || 0) + 1,
          })
          .eq('id', subscription.id);
      }

      return false;
    }
  }

  private async markNotificationSent(notificationId: string) {
    await supabase
      .from('notification_queue')
      .update({
        status: 'sent',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId);
  }

  private async markNotificationFailed(notificationId: string, errorMessage: string) {
    const { data: notification } = await supabase
      .from('notification_queue')
      .select('attempts')
      .eq('id', notificationId)
      .maybeSingle();

    const attempts = (notification?.attempts || 0) + 1;
    const status = attempts >= 3 ? 'failed' : 'pending';

    if (attempts > 1) {
      this.metrics.retry_count++;
    }

    await supabase
      .from('notification_queue')
      .update({
        status,
        attempts,
        error_message: errorMessage,
        processed_at: status === 'failed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId);
  }

  async saveSubscription(userId: string, subscription: webpush.PushSubscription) {
    try {
      const { error } = await supabase
        .from('web_push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          status: 'active',
          user_agent: 'web',
          subscription_data: subscription,
        }, {
          onConflict: 'endpoint',
        });

      if (error) {
        throw new Error(`Error saving subscription: ${error.message}`);
      }

      logger.info(`Subscription saved for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error in saveSubscription:', error);
      throw error;
    }
  }

  async removeSubscription(userId: string, endpoint: string) {
    try {
      const { error } = await supabase
        .from('web_push_subscriptions')
        .update({ status: 'inactive' })
        .match({ user_id: userId, endpoint });

      if (error) {
        throw new Error(`Error removing subscription: ${error.message}`);
      }

      logger.info(`Subscription removed for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error in removeSubscription:', error);
      throw error;
    }
  }

  async queueNotification(recipientId: string, payload: NotificationPayload, priority: number = 0) {
    try {
      const { error } = await supabase
        .from('notification_queue')
        .insert({
          recipient_id: recipientId,
          title: payload.title,
          body: payload.body,
          data: {
            ...payload.data,
            icon: payload.icon,
            badge: payload.badge,
          },
          priority,
          status: 'pending',
        });

      if (error) {
        throw new Error(`Error queueing notification: ${error.message}`);
      }

      logger.info(`Notification queued for user ${recipientId}`);
      return true;
    } catch (error) {
      logger.error('Error in queueNotification:', error);
      throw error;
    }
  }

  getMetrics(): NotificationMetrics {
    return { ...this.metrics };
  }
}

export const notificationService = new NotificationService();
