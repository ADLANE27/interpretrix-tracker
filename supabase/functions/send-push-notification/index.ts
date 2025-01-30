import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import webpush from 'https://esm.sh/web-push@3.6.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushMessage {
  title: string
  body: string
  icon?: string
  data?: Record<string, unknown>
  interpreterIds?: string[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
    
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys are not configured')
    }

    webpush.setVapidDetails(
      'mailto:debassi.adlane@gmail.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { message } = await req.json() as { message: PushMessage }
    const { title, body, icon, data, interpreterIds } = message

    console.log('Processing push notification request:', { title, interpreterIds })

    // Query active subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('status', 'active')
      .in('interpreter_id', interpreterIds || [])

    if (fetchError) {
      throw new Error(`Error fetching subscriptions: ${fetchError.message}`)
    }

    console.log(`Found ${subscriptions.length} active subscriptions`)

    // Process subscriptions in parallel with rate limiting
    const BATCH_SIZE = 50
    const DELAY_BETWEEN_BATCHES = 1000 // 1 second

    const processSubscriptionBatch = async (batch: typeof subscriptions) => {
      const notifications = batch.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          }

          const payload = JSON.stringify({
            title,
            body,
            icon,
            data: {
              ...data,
              timestamp: new Date().toISOString(),
            },
          })

          await webpush.sendNotification(pushSubscription, payload)

          // Update last successful push
          await supabase
            .from('push_subscriptions')
            .update({ 
              last_successful_push: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id)

          console.log(`Successfully sent notification to subscription ${subscription.id}`)
          return { success: true, id: subscription.id }
        } catch (error) {
          console.error(`Error sending notification to subscription ${subscription.id}:`, error)

          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription is no longer valid
            await supabase
              .from('push_subscriptions')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id)
          } else {
            // Other error occurred
            await supabase
              .from('push_subscriptions')
              .update({ 
                status: 'error',
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id)
          }

          return { success: false, id: subscription.id, error: error.message }
        }
      })

      return Promise.all(notifications)
    }

    // Process subscriptions in batches
    const results = []
    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      const batch = subscriptions.slice(i, i + BATCH_SIZE)
      const batchResults = await processSubscriptionBatch(batch)
      results.push(...batchResults)

      if (i + BATCH_SIZE < subscriptions.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`Notification sending complete. Successes: ${successCount}, Failures: ${failureCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notifications sent. Successes: ${successCount}, Failures: ${failureCount}`,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in send-push-notification:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})