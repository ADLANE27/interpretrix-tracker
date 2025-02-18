
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import webpush from 'https://esm.sh/web-push@3.6.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://89bd4db4-56a9-42cc-a890-6f3507bfb0c7.lovableproject.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialisation de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Configuration des clés VAPID
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Missing VAPID keys')
    }

    webpush.setVapidDetails(
      'mailto:contact@aftraduction.fr',
      vapidPublicKey,
      vapidPrivateKey
    )

    // Récupération des données de la requête
    const { userId, title, body, data } = await req.json()
    console.log('Sending test notification to user:', userId)

    // Récupération de la souscription de l'utilisateur
    const { data: subscriptionData, error: fetchError } = await supabase
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single()

    if (fetchError || !subscriptionData) {
      throw new Error('No push subscription found for this user')
    }

    // Envoi de la notification
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

    console.log('Notification sent successfully:', result)

    return new Response(
      JSON.stringify({ message: 'Notification sent successfully' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending notification:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred'
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

