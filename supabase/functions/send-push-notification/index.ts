
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webPush from 'npm:web-push'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface PushData {
  type: string;
  missionId: string;
  missionType: 'immediate' | 'scheduled';
  sourceLanguage: string;
  targetLanguage: string;
  duration: number;
  startTime?: string;
  endTime?: string;
}

interface RequestBody {
  userId: string;
  notificationId: string;
  data: PushData;
}

console.log('Loading send-push-notification function')

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Get VAPID keys from environment variables
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!publicKey || !privateKey) {
      console.error('VAPID keys not found')
      throw new Error('VAPID configuration missing')
    }

    // Configure web-push
    webPush.setVapidDetails(
      'mailto:support@interpreter-platform.com',
      publicKey,
      privateKey
    )

    // Get request body
    const body: RequestBody = await req.json()
    console.log('Received push notification request:', JSON.stringify(body))

    // Create supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get user's push subscription
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', body.userId)
      .single()

    if (subscriptionError || !subscriptionData) {
      console.error('Error fetching subscription:', subscriptionError)
      throw new Error('Push subscription not found')
    }

    // Prepare notification content
    const title = body.data.missionType === 'immediate' 
      ? '🚨 Nouvelle mission immédiate'
      : '📅 Nouvelle mission programmée'

    const message = `${body.data.sourceLanguage} → ${body.data.targetLanguage} - ${body.data.duration} minutes`

    const payload = JSON.stringify({
      title,
      message,
      data: body.data
    })

    console.log('Sending push notification with payload:', payload)

    // Send push notification
    const pushResult = await webPush.sendNotification(
      subscriptionData.subscription,
      payload
    )

    console.log('Push notification sent successfully:', pushResult)

    // Record notification in history
    const { error: historyError } = await supabaseClient
      .from('notification_history')
      .insert({
        user_id: body.userId,
        title,
        body: message,
        notification_type: 'mission',
        reference_type: 'mission',
        reference_id: body.data.missionId,
        payload: body.data,
        delivery_status: 'delivered',
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString()
      })

    if (historyError) {
      console.error('Error recording notification history:', historyError)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in send-push-notification:', error)

    // Try to get structured error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error && error.stack ? error.stack : ''

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
