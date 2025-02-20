
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { serve } from "https://deno.fresh.run/std@v10.10.0/http/server.ts"
import webPush from 'https://esm.sh/web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationQueueItem {
  id: string;
  user_id: string;
  payload: {
    title?: string;
    body?: string;
    type?: string;
    missionId?: string;
    missionType?: string;
    [key: string]: any;
  };
  notification_type: string;
  reference_id?: string;
  reference_type?: string;
  retry_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[process-notification-queue] Starting notification processing');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Configure web push with proper error handling
    try {
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
      
      if (!vapidPublicKey || !vapidPrivateKey) {
        throw new Error('VAPID keys not configured');
      }

      webPush.setVapidDetails(
        'mailto:admin@example.com',
        vapidPublicKey,
        vapidPrivateKey
      );
      console.log('[process-notification-queue] Web Push configured successfully');
    } catch (error) {
      console.error('[process-notification-queue] Web Push configuration error:', error);
      throw error;
    }

    // Get pending notifications with proper type checking
    const { data: notifications, error: fetchError } = await supabaseClient
      .from('notification_queue')
      .select('*')
      .eq('status', 'processing')
      .limit(50);

    if (fetchError) {
      console.error('[process-notification-queue] Error fetching notifications:', fetchError);
      throw fetchError;
    }

    const typedNotifications = notifications as NotificationQueueItem[] | null;
    console.log(`[process-notification-queue] Processing ${typedNotifications?.length ?? 0} notifications`);

    // Process each notification with proper error handling
    for (const notification of typedNotifications ?? []) {
      console.log(`[process-notification-queue] Processing notification ${notification.id}`);
      
      try {
        // Get user's push subscription
        const { data: subscriptions, error: subError } = await supabaseClient
          .from('user_push_subscriptions')
          .select('subscription')
          .eq('user_id', notification.user_id)
          .single();

        if (subError) {
          throw new Error(`Subscription fetch error: ${subError.message}`);
        }

        if (!subscriptions?.subscription) {
          throw new Error(`No subscription found for user ${notification.user_id}`);
        }

        // Send push notification
        await webPush.sendNotification(
          subscriptions.subscription as webPush.PushSubscription,
          JSON.stringify({
            ...notification.payload,
            notificationId: notification.id // Include for delivery confirmation
          })
        );

        console.log(`[process-notification-queue] Push notification sent for ${notification.id}`);

        // Update notification status to sent
        const { error: updateError } = await supabaseClient
          .from('notification_queue')
          .update({
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        if (updateError) {
          console.error(`[process-notification-queue] Error updating notification status:`, updateError);
        }

        // Record in notification history
        const { error: historyError } = await supabaseClient
          .from('notification_history')
          .insert({
            user_id: notification.user_id,
            notification_type: notification.notification_type,
            reference_id: notification.reference_id,
            reference_type: notification.reference_type,
            title: notification.payload.title ?? 'New Notification',
            body: notification.payload.body ?? JSON.stringify(notification.payload),
            payload: notification.payload,
            sent_at: new Date().toISOString(),
            delivery_status: 'sent'
          });

        if (historyError) {
          console.error(`[process-notification-queue] Error recording history:`, historyError);
        }

      } catch (error) {
        console.error(`[process-notification-queue] Error processing notification ${notification.id}:`, error);

        // Update notification status to failed if max retries reached
        const status = notification.retry_count >= 5 ? 'failed' : 'pending';
        
        const { error: updateError } = await supabaseClient
          .from('notification_queue')
          .update({
            status,
            last_error: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        if (updateError) {
          console.error(`[process-notification-queue] Error updating failed notification:`, updateError);
        }

        if (status === 'failed') {
          const { error: historyError } = await supabaseClient
            .from('notification_history')
            .insert({
              user_id: notification.user_id,
              notification_type: notification.notification_type,
              reference_id: notification.reference_id,
              reference_type: notification.reference_type,
              title: notification.payload.title ?? 'New Notification',
              body: notification.payload.body ?? JSON.stringify(notification.payload),
              payload: notification.payload,
              delivery_status: 'failed',
              error_message: error.message
            });

          if (historyError) {
            console.error(`[process-notification-queue] Error recording failed notification:`, historyError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed: typedNotifications?.length ?? 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[process-notification-queue] Critical error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
