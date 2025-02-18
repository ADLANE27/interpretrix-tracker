
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webPush from 'npm:web-push@3.6.7'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Set VAPID details
    webPush.setVapidDetails(
      'mailto:test@test.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    const { userId, title, body, data } = await req.json()
    console.log('Received notification request:', { userId, title, body, data })

    // Get user's push subscription
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single()

    if (subscriptionError || !subscriptionData?.subscription) {
      console.error('Error getting subscription:', subscriptionError)
      throw new Error('No subscription found for user')
    }

    console.log('Found subscription:', subscriptionData.subscription)

    const pushPayload = {
      title,
      body,
      data: {
        url: data?.url || '/',
        ...data
      }
    }

    console.log('Sending push notification with payload:', pushPayload)

    // Send push notification
    await webPush.sendNotification(
      subscriptionData.subscription,
      JSON.stringify(pushPayload)
    )

    console.log('Push notification sent successfully')

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  } catch (error) {
    console.error('Error sending push notification:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  }
})

