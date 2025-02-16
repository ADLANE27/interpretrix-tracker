
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: string;
}

class NotificationService {
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
        'mailto:contact@your-domain.com', // Replace with your contact email
        vapidKeys.public_key,
        vapidKeys.private_key
      );

      logger.info('Notification service initialized with VAPID keys');
    } catch (error) {
      logger.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  async sendNotification(userId: string, payload: NotificationPayload) {
    try {
      // Get user's active subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('web_push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (subError) {
        throw new Error(`Error fetching subscriptions: ${subError.message}`);
      }

      if (!subscriptions?.length) {
        logger.warn(`No active subscriptions found for user ${userId}`);
        return false;
      }

      // Create notification record
      const { data: notification, error: notifError } = await supabase
        .from('notification_messages')
        .insert({
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          icon_url: payload.icon,
          badge_url: payload.badge,
          sender_id: userId,
        })
        .select()
        .single();

      if (notifError) {
        throw new Error(`Error creating notification record: ${notifError.message}`);
      }

      // Send to all active subscriptions
      const sendPromises = subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh_key,
                auth: subscription.auth_key,
              },
            },
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              ...payload.data,
              icon: payload.icon,
              badge: payload.badge,
              notificationId: notification.id,
            })
          );

          // Record successful delivery
          await supabase.from('notification_recipients').insert({
            notification_id: notification.id,
            recipient_id: userId,
            status: 'delivered',
            delivered_at: new Date().toISOString(),
          });

          // Update subscription last used timestamp
          await supabase
            .from('web_push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('endpoint', subscription.endpoint);

          return true;
        } catch (error: any) {
          logger.error(`Failed to send push notification: ${error.message}`);
          
          if (error.statusCode === 410 || error.code === 'ECONNRESET') {
            // Subscription is expired or invalid
            await supabase
              .from('web_push_subscriptions')
              .update({ status: 'expired' })
              .eq('endpoint', subscription.endpoint);
          }

          // Record failed delivery
          await supabase.from('notification_recipients').insert({
            notification_id: notification.id,
            recipient_id: userId,
            status: 'failed',
            error_message: error.message,
          });

          return false;
        }
      });

      const results = await Promise.all(sendPromises);
      return results.some(result => result);
    } catch (error) {
      logger.error('Error in sendNotification:', error);
      throw error;
    }
  }

  async saveSubscription(userId: string, subscription: webpush.PushSubscription) {
    try {
      const { error } = await supabase.from('web_push_subscriptions').upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        status: 'active',
        user_agent: 'web',
      }, {
        onConflict: 'user_id, endpoint',
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
}

export const notificationService = new NotificationService();
