
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

    console.log('Creating notification history record')

    // Create notification history record
    const { error: historyError } = await supabaseClient
      .from('notification_history')
      .insert({
        user_id: payload.userId,
        notification_type: 'mission',
        title: notificationPayload.title,
        body: notificationPayload.body,
        payload: notificationPayload,
        reference_type: 'mission',
        reference_id: payload.data.missionId,
        delivery_status: 'pending',
        created_at: new Date().toISOString()
      })

    if (historyError) {
      console.error('Error creating notification history:', historyError)
      throw historyError
    }

    // Update mission notification status
    await supabaseClient
      .from('mission_notifications')
      .update({
        delivery_status: 'sending',
        push_sent_at: new Date().toISOString()
      })
      .eq('mission_id', payload.data.missionId)
      .eq('interpreter_id', payload.userId)

    console.log('Sending push notification with payload:', notificationPayload)

    try {
      // Send push notification
      const pushResult = await webpush.sendNotification(
        subscription,
        JSON.stringify(notificationPayload)
      )

      console.log('Push notification sent successfully:', pushResult)

      // Update notification history and mission notification with success
      await Promise.all([
        supabaseClient
          .from('notification_history')
          .update({
            delivery_status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('reference_id', payload.data.missionId)
          .eq('user_id', payload.userId),

        supabaseClient
          .from('mission_notifications')
          .update({
            delivery_status: 'delivered',
            push_delivered_at: new Date().toISOString()
          })
          .eq('mission_id', payload.data.missionId)
          .eq('interpreter_id', payload.userId)
      ])

      return new Response(
        JSON.stringify({ success: true, message: 'Push notification sent' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )

    } catch (pushError) {
      console.error('Error sending push notification:', pushError)

      // Update notification history and mission notification with error
      await Promise.all([
        supabaseClient
          .from('notification_history')
          .update({
            delivery_status: 'failed',
            error_message: pushError instanceof Error ? pushError.message : 'Unknown error'
          })
          .eq('reference_id', payload.data.missionId)
          .eq('user_id', payload.userId),

        supabaseClient
          .from('mission_notifications')
          .update({
            delivery_status: 'failed',
            push_error: pushError instanceof Error ? pushError.message : 'Unknown error'
          })
          .eq('mission_id', payload.data.missionId)
          .eq('interpreter_id', payload.userId)
      ])

      throw pushError
    }

  } catch (error) {
    console.error('Error in push notification process:', error)
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
