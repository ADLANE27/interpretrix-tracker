
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

webpush.setVapidDetails(
  'mailto:contact@your-domain.com',
  config.vapid.publicKey,
  config.vapid.privateKey
);

export class NotificationService {
  async sendNotification(userId: string, notification: { title: string; body: string; data?: any }) {
    try {
      // Get user's subscription
      const { data: subscriptions, error: subError } = await supabase
        .from('web_push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (subError) {
        throw new Error(`Error fetching subscriptions: ${subError.message}`);
      }

      if (!subscriptions?.length) {
        throw new Error('No active subscriptions found for user');
      }

      // Create notification record
      const { data: notificationRecord, error: notifError } = await supabase
        .from('notification_messages')
        .insert({
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
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
              title: notification.title,
              body: notification.body,
              data: {
                ...notification.data,
                notificationId: notificationRecord.id,
              },
            })
          );

          // Record successful delivery
          await supabase.from('notification_recipients').insert({
            notification_id: notificationRecord.id,
            recipient_id: userId,
            status: 'sent',
          });

          return true;
        } catch (error: any) {
          logger.error(`Push notification failed: ${error.message}`);
          
          if (error.statusCode === 410) {
            // Subscription has expired
            await supabase
              .from('web_push_subscriptions')
              .update({ status: 'expired' })
              .eq('id', subscription.id);
          }

          // Record failed delivery
          await supabase.from('notification_recipients').insert({
            notification_id: notificationRecord.id,
            recipient_id: userId,
            status: 'failed',
            error_message: error.message,
          });

          return false;
        }
      });

      const results = await Promise.all(sendPromises);
      return results.some(result => result); // Return true if at least one notification was sent
    } catch (error: any) {
      logger.error(`Notification service error: ${error.message}`);
      throw error;
    }
  }

  async saveSubscription(userId: string, subscription: webpush.PushSubscription) {
    try {
      const { error } = await supabase.from('web_push_subscriptions').upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        auth_key: subscription.keys.auth,
        p256dh_key: subscription.keys.p256dh,
        status: 'active',
        user_agent: 'web',
      }, {
        onConflict: 'user_id,endpoint',
      });

      if (error) {
        throw new Error(`Error saving subscription: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      logger.error(`Save subscription error: ${error.message}`);
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

      return true;
    } catch (error: any) {
      logger.error(`Remove subscription error: ${error.message}`);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
