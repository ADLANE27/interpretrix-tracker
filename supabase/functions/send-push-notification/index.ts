import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webPush from 'npm:web-push'
import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { message } = await req.json()
    console.log('Received push notification request:', message)
    
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not found in environment variables')
      throw new Error('VAPID keys not configured')
    }
    
    webPush.setVapidDetails(
      'mailto:debassi.adlane@gmail.com',
      vapidPublicKey,
      vapidPrivateKey
    )
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    console.log('Fetching active subscriptions for interpreters:', message.interpreterIds)
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('status', 'active')
      .in('interpreter_id', message.interpreterIds || [])
    
    if (subscriptionError) {
      console.error('Error fetching subscriptions:', subscriptionError)
      throw subscriptionError
    }

    console.log(`Found ${subscriptions?.length || 0} active subscriptions`)
    
    const notifications = subscriptions?.map(async (sub) => {
      try {
        console.log(`Sending notification to subscription ${sub.id}`)
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          JSON.stringify({
            title: message.title,
            body: message.body,
            icon: message.icon,
            data: message.data
          })
        )
        
        console.log(`Successfully sent notification to subscription ${sub.id}`)
        
        // Update last successful push timestamp
        await supabase
          .from('push_subscriptions')
          .update({ 
            last_successful_push: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id)
          
      } catch (error) {
        console.error(`Failed to send notification to subscription ${sub.id}:`, error)
        
        if (error.statusCode === 410) {
          console.log(`Subscription ${sub.id} is expired, updating status`)
          await supabase
            .from('push_subscriptions')
            .update({ 
              status: 'expired',
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id)
        }
      }
    })
    
    await Promise.all(notifications || [])
    console.log('All notifications processed')
    
    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      },
    )
  } catch (error) {
    console.error('Error in send-push-notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500
      },
    )
  }
})