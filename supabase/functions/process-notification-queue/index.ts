
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

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

    // Get pending notifications
    const { data: notifications, error: notificationsError } = await supabaseClient
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (notificationsError) {
      throw notificationsError
    }

    console.log(`Processing ${notifications?.length || 0} notifications`)

    for (const notification of notifications || []) {
      try {
        // Get user's push subscription
        const { data: subscriptionData, error: subscriptionError } = await supabaseClient
          .from('user_push_subscriptions')
          .select('*')
          .eq('user_id', notification.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (subscriptionError || !subscriptionData) {
          console.error('No subscription found for user:', notification.user_id)
          continue
        }

        // Get VAPID keys
        const { data: vapidKeys, error: vapidError } = await supabaseClient
          .from('secrets')
          .select('name, value')
          .in('name', ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'])

        if (vapidError || !vapidKeys?.length) {
          throw new Error('Failed to retrieve VAPID keys')
        }

        const vapidPublicKey = vapidKeys.find(k => k.name === 'VAPID_PUBLIC_KEY')?.value
        const vapidPrivateKey = vapidKeys.find(k => k.name === 'VAPID_PRIVATE_KEY')?.value

        if (!vapidPublicKey || !vapidPrivateKey) {
          throw new Error('VAPID keys not found')
        }

        // Send push notification
        const response = await supabaseClient.functions.invoke('send-push-notification', {
          body: {
            subscription: subscriptionData.subscription,
            payload: notification.payload,
            vapidPublicKey,
            vapidPrivateKey
          }
        })

        console.log('Push notification response:', response)

        // Update notification status
        await supabaseClient
          .from('notification_queue')
          .update({
            status: response.data?.success ? 'delivered' : 'failed',
            error_message: response.data?.error,
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)

      } catch (error) {
        console.error('Error processing notification:', error)
        
        // Update notification status as failed
        await supabaseClient
          .from('notification_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error in notification queue processor:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
