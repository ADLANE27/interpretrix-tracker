
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { serve } from "https://deno.fresh.run/std@v10.10.0/http/server.ts"
import webPush from 'https://esm.sh/web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Configure web push
    webPush.setVapidDetails(
      'mailto:admin@example.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    // Get pending notifications
    const { data: notifications, error: fetchError } = await supabaseClient
      .from('notification_queue')
      .select('*')
      .eq('status', 'processing')
      .limit(50)

    if (fetchError) {
      throw fetchError
    }

    console.log(`Processing ${notifications?.length ?? 0} notifications`)

    // Process each notification
    for (const notification of notifications ?? []) {
      try {
        // Get user's push subscription
        const { data: subscriptions, error: subError } = await supabaseClient
          .from('user_push_subscriptions')
          .select('subscription')
          .eq('user_id', notification.user_id)
          .single()

        if (subError || !subscriptions?.subscription) {
          throw new Error(`No subscription found for user ${notification.user_id}`)
        }

        // Send push notification
        await webPush.sendNotification(
          subscriptions.subscription as webPush.PushSubscription,
          JSON.stringify(notification.payload)
        )

        // Update notification status to sent
        await supabaseClient
          .from('notification_queue')
          .update({
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        // Record in notification history
        await supabaseClient
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
            delivered_at: new Date().toISOString(),
            delivery_status: 'delivered'
          })

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error)

        // Update notification status to failed if max retries reached
        const status = notification.retry_count >= 5 ? 'failed' : 'pending'
        
        await supabaseClient
          .from('notification_queue')
          .update({
            status,
            last_error: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        if (status === 'failed') {
          // Record failed notification in history
          await supabaseClient
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
            })
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in process-notification-queue:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
