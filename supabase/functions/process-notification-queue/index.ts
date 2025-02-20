
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webPush from 'https://esm.sh/web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error('VAPID keys must be set')
}

webPush.setVapidDetails(
  'mailto:admin@aftranslation.fr',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[process-notification-queue] Starting notification processing');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get pending notifications
    const { data: notifications, error: fetchError } = await supabaseClient
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('[process-notification-queue] Error fetching notifications:', fetchError);
      throw fetchError
    }

    console.log(`[process-notification-queue] Processing ${notifications?.length ?? 0} notifications`);

    const results = [];
    for (const notification of notifications ?? []) {
      try {
        console.log(`[process-notification-queue] Processing notification ${notification.id} for user ${notification.user_id}`);

        // Update status to processing
        await supabaseClient
          .from('notification_queue')
          .update({
            status: 'processing',
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        const { data: subscriptions, error: subscriptionError } = await supabaseClient
          .from('user_push_subscriptions')
          .select('subscription')
          .eq('user_id', notification.user_id)
          .single()

        if (subscriptionError) {
          console.error(`[process-notification-queue] Error fetching subscription for user ${notification.user_id}:`, subscriptionError);
          throw subscriptionError;
        }

        if (!subscriptions?.subscription) {
          console.log(`[process-notification-queue] No subscription found for user ${notification.user_id}`);
          throw new Error('No subscription found');
        }

        // Create the proper notification payload structure
        const pushPayload = {
          title: notification.payload.title || 'Nouvelle mission',
          body: notification.payload.body || 'Une nouvelle mission est disponible',
          data: {
            ...notification.payload,
            notificationId: notification.id,
            url: `${Deno.env.get('PUBLIC_APP_URL') || 'https://app.aftranslation.fr'}/interpreter/missions`
          }
        }

        console.log(`[process-notification-queue] Sending push notification to user ${notification.user_id}:`, pushPayload);

        // Send the notification
        await webPush.sendNotification(
          subscriptions.subscription,
          JSON.stringify(pushPayload)
        )

        // Update notification status to sent
        await supabaseClient
          .from('notification_queue')
          .update({
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        // Add to notification history
        await supabaseClient
          .from('notification_history')
          .insert({
            user_id: notification.user_id,
            notification_type: notification.notification_type,
            reference_id: notification.reference_id,
            reference_type: notification.reference_type,
            payload: pushPayload,
            title: pushPayload.title,
            body: pushPayload.body,
            sent_at: new Date().toISOString(),
            delivery_status: 'sent'
          })

        results.push({ id: notification.id, status: 'success' });
        console.log(`[process-notification-queue] Successfully processed notification ${notification.id}`);

      } catch (error) {
        console.error(`[process-notification-queue] Error processing notification ${notification.id}:`, error);

        // Update notification status to failed
        await supabaseClient
          .from('notification_queue')
          .update({
            status: 'failed',
            last_error: error.message,
            updated_at: new Date().toISOString(),
            retry_count: (notification.retry_count || 0) + 1
          })
          .eq('id', notification.id)

        results.push({ id: notification.id, status: 'error', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('[process-notification-queue] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
