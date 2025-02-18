
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import webpush from 'https://esm.sh/web-push@3.6.6'

const ALLOWED_ORIGINS = [
  'https://89bd4db4-56a9-42cc-a890-6f3507bfb0c7.lovableproject.com',
  'https://interpretix.netlify.app'
] as const;

function createCorsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-client-info, apikey',
    'Access-Control-Max-Age': '86400',
  }
}

Deno.serve(async (req) => {
  try {
    console.log('[send-test-notification] Starting function execution')
    
    // Get and validate origin
    const origin = req.headers.get('origin') || ''
    if (!ALLOWED_ORIGINS.includes(origin)) {
      console.error('[send-test-notification] Invalid origin:', origin)
      return new Response('Invalid origin', { 
        status: 403,
        headers: createCorsHeaders(origin)
      })
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('[send-test-notification] Handling CORS preflight request')
      return new Response(null, {
        headers: createCorsHeaders(origin)
      })
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Configuration error: Missing VAPID keys')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuration error: Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    webpush.setVapidDetails(
      'mailto:contact@aftraduction.fr',
      vapidPublicKey,
      vapidPrivateKey
    )

    const { userId, title, body, data } = await req.json()
    
    if (!userId || !title || !body) {
      throw new Error('Missing required fields: userId, title, and body are required')
    }

    const { data: subscriptionData, error: fetchError } = await supabase
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch subscription: ${fetchError.message}`)
    }

    if (!subscriptionData) {
      throw new Error('No push subscription found for this user')
    }

    const pushPayload = {
      title,
      body,
      data: {
        url: data?.url || '/',
        ...data
      }
    }

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
          ...createCorsHeaders(origin),
          'Content-Type': 'application/json',
        }
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
        status: 500,
        headers: {
          ...createCorsHeaders(req.headers.get('origin') || ''),
          'Content-Type': 'application/json',
        }
      }
    )
  }
})
