
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
      throw fetchError
    }

    console.log(`Processing ${notifications?.length ?? 0} notifications`)

    for (const notification of notifications ?? []) {
      try {
        console.log(`Processing notification ${notification.id} for user ${notification.user_id}`)

        const { data: subscriptions, error: subscriptionError } = await supabaseClient
          .from('user_push_subscriptions')
          .select('subscription')
          .eq('user_id', notification.user_id)
          .single()

        if (subscriptionError) {
          console.error(`Error fetching subscription for user ${notification.user_id}:`, subscriptionError)
          continue
        }

        if (!subscriptions?.subscription) {
          console.log(`No subscription found for user ${notification.user_id}`)
          continue
        }

        // Create the proper notification payload structure
        const pushPayload = {
          title: notification.payload.title || 'Nouvelle mission',
          body: notification.payload.body || 'Une nouvelle mission est disponible',
          type: 'mission',
          missionType: notification.payload.missionType || 'immediate',
          notificationId: notification.id,
          data: {
            ...notification.payload,
            notificationId: notification.id
          }
        }

        console.log(`Sending push notification to user ${notification.user_id}:`, pushPayload)

        await webPush.sendNotification(
          subscriptions.subscription,
          JSON.stringify(pushPayload)
        )

        // Update notification status to sent
        const { error: updateError } = await supabaseClient
          .from('notification_queue')
          .update({
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        if (updateError) {
          console.error(`Error updating notification ${notification.id}:`, updateError)
        }

        // Add to notification history
        const { error: historyError } = await supabaseClient
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

        if (historyError) {
          console.error(`Error creating history entry for notification ${notification.id}:`, historyError)
        }

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error)

        // Update notification status to failed
        const { error: updateError } = await supabaseClient
          .from('notification_queue')
          .update({
            status: 'failed',
            last_error: error.message,
            updated_at: new Date().toISOString(),
            retry_count: (notification.retry_count || 0) + 1
          })
          .eq('id', notification.id)

        if (updateError) {
          console.error(`Error updating failed notification ${notification.id}:`, updateError)
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in notification processor:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

