
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import webpush from 'npm:web-push@3.6.1'

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
    const body = await req.json()
    console.log('[Push] Received request body:', JSON.stringify(body, null, 2))

    const { userId, title, body: notificationBody, data } = body

    if (!userId) {
      throw new Error('userId is required')
    }

    // Get required environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push] Missing VAPID keys')
      throw new Error('Server configuration error: Missing VAPID keys')
    }

    // Configure web push
    webpush.setVapidDetails(
      'mailto:contact@aftrad.com',
      vapidPublicKey,
      vapidPrivateKey
    )

    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(
      supabaseUrl ?? '',
      supabaseServiceKey ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('[Push] Fetching subscription for user:', userId)

    // Get user's push subscription
    const { data: subscriptions, error: fetchError } = await supabase
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('[Push] Error fetching subscription:', fetchError)
      throw new Error(`Failed to fetch subscription: ${fetchError.message}`)
    }

    if (!subscriptions?.subscription) {
      console.error('[Push] No subscription found for user:', userId)
      throw new Error('No subscription found')
    }

    const subscription = subscriptions.subscription
    console.log('[Push] Found subscription:', JSON.stringify(subscription, null, 2))

    // Validate subscription format
    if (!subscription.endpoint || !subscription.keys?.auth || !subscription.keys?.p256dh) {
      console.error('[Push] Invalid subscription format:', subscription)
      throw new Error('Invalid subscription format')
    }

    // Prepare notification payload
    const payload = {
      title: title || 'Nouvelle notification',
      body: notificationBody || 'Vous avez reçu une nouvelle notification',
      data: {
        ...data,
        url: data?.url || '/interpreter'
      },
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    }

    console.log('[Push] Sending notification with payload:', JSON.stringify(payload, null, 2))

    try {
      const result = await webpush.sendNotification(
        subscription,
        JSON.stringify(payload)
      )

      console.log('[Push] Notification sent successfully:', result.statusCode)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notification sent successfully',
          statusCode: result.statusCode 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )

    } catch (pushError: any) {
      console.error('[Push] Push notification error:', pushError)

      // Handle expired subscriptions
      if (pushError.statusCode === 404 || pushError.statusCode === 410) {
        console.log('[Push] Subscription expired, removing from database')
        
        const { error: deleteError } = await supabase
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', userId)

        if (deleteError) {
          console.error('[Push] Error deleting expired subscription:', deleteError)
        }

        throw new Error('Subscription expired')
      }

      throw pushError
    }

  } catch (error: any) {
    console.error('[Push] Function error:', error.message)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
