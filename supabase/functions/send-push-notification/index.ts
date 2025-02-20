
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import webpush from "npm:web-push@3.6.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushPayload {
  userId: string;
  data: {
    type: string;
    missionId: string;
    missionType: 'immediate' | 'scheduled';
    sourceLanguage: string;
    targetLanguage: string;
    duration: number;
    startTime?: string;
    endTime?: string;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Initialize web-push with VAPID keys
    webpush.setVapidDetails(
      'mailto:contact@lovable.ai',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    const payload: PushPayload = await req.json()
    console.log('Received push notification request:', payload)

    // Get user's push subscription
    const { data: subscriptions, error: subscriptionError } = await supabaseClient
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', payload.userId)
      .single()

    if (subscriptionError || !subscriptions?.subscription) {
      console.error('Error fetching subscription:', subscriptionError)
      throw new Error('No subscription found for user')
    }

    const subscription = subscriptions.subscription

    // Prepare notification content
    const notificationPayload = {
      title: payload.data.missionType === 'immediate' ? 
        '🚨 Nouvelle mission immédiate' : 
        '📅 Nouvelle mission programmée',
      body: `${payload.data.sourceLanguage} → ${payload.data.targetLanguage} - ${payload.data.duration} minutes`,
      data: payload.data
    }

    console.log('Sending push notification with payload:', notificationPayload)

    // Send push notification
    const pushResult = await webpush.sendNotification(
      subscription,
      JSON.stringify(notificationPayload)
    )

    console.log('Push notification sent successfully:', pushResult)

    return new Response(
      JSON.stringify({ success: true, message: 'Push notification sent' }),
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
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
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
