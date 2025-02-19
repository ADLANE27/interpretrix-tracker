
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import * as webPush from 'https://esm.sh/web-push@3.6.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Set VAPID details
    webPush.setVapidDetails(
      'mailto:contact@aftrad.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    // Get request body
    const { userId, title, body, data } = await req.json()
    console.log('Received notification request:', { userId, title, body, data })

    // Get user's push subscription
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single()

    if (subError || !subscriptions?.subscription) {
      console.error('Error fetching subscription:', subError)
      return new Response(
        JSON.stringify({ error: 'No push subscription found for user' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Found subscription:', subscriptions.subscription)

    // Send push notification
    try {
      const result = await webPush.sendNotification(
        subscriptions.subscription,
        JSON.stringify({
          title,
          body,
          data
        })
      )
      console.log('Push notification sent successfully:', result)
      
      return new Response(
        JSON.stringify({ message: 'Notification sent successfully' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      console.error('Error sending push notification:', error)
      
      // Check if subscription has expired
      if (error.statusCode === 410) {
        console.log('Subscription has expired, removing from database')
        await supabaseClient
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', userId)
          
        return new Response(
          JSON.stringify({ error: 'SUBSCRIPTION_EXPIRED' }),
          { 
            status: 410,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      throw error
    }
  } catch (error) {
    console.error('Server error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
