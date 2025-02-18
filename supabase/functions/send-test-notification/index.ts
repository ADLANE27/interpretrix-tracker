
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import webpush from 'https://esm.sh/web-push@3.6.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Gestion améliorée du CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[send-test-notification] Handling CORS preflight request')
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    })
  }

  try {
    console.log('[send-test-notification] Starting function execution')

    // 2. Validation des variables d'environnement VAPID
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[send-test-notification] Missing VAPID keys')
      throw new Error('Configuration error: Missing VAPID keys')
    }

    // Initialisation de Supabase avec validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      console.error('[send-test-notification] Missing Supabase configuration')
      throw new Error('Configuration error: Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Configuration webpush avec les clés VAPID
    webpush.setVapidDetails(
      'mailto:contact@aftraduction.fr',
      vapidPublicKey,
      vapidPrivateKey
    )

    // 3. Validation et parsing du body de la requête
    const { userId, title, body, data } = await req.json()
    
    if (!userId || !title || !body) {
      console.error('[send-test-notification] Missing required fields in request body')
      throw new Error('Missing required fields: userId, title, and body are required')
    }

    console.log('[send-test-notification] Sending notification to user:', userId)

    // Récupération de la souscription
    const { data: subscriptionData, error: fetchError } = await supabase
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('[send-test-notification] Error fetching subscription:', fetchError)
      throw new Error(`Failed to fetch subscription: ${fetchError.message}`)
    }

    if (!subscriptionData) {
      console.error('[send-test-notification] No subscription found for user:', userId)
      throw new Error('No push subscription found for this user')
    }

    // Préparation et envoi de la notification
    const pushPayload = {
      title,
      body,
      data: {
        url: data?.url || '/',
        ...data
      }
    }

    console.log('[send-test-notification] Sending push notification with payload:', pushPayload)

    const result = await webpush.sendNotification(
      subscriptionData.subscription,
      JSON.stringify(pushPayload)
    )

    console.log('[send-test-notification] Notification sent successfully:', result)

    return new Response(
      JSON.stringify({ 
        message: 'Notification sent successfully',
        status: 'success'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error('[send-test-notification] Error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
        status: 'error'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    )
  }
})
