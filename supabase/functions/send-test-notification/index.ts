
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as webPush from "https://esm.sh/web-push@3.4.5"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, content-length, host, user-agent, accept',
  'Access-Control-Max-Age': '86400'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Received notification request');

    // Verify authorization
    const { authorization } = req.headers
    if (!authorization) {
      throw new Error('Missing authorization header')
    }

    // Get VAPID keys from environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('Missing VAPID keys in environment variables')
      throw new Error('Push notification configuration missing')
    }

    // Set up web-push with VAPID keys
    webPush.setVapidDetails(
      'mailto:support@aftrad.com',
      vapidPublicKey,
      vapidPrivateKey
    )

    // Parse request body
    const { userId, title, body, data, missionType = 'test' } = await req.json()
    console.log('Processing notification request for user:', userId, 'type:', missionType);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Get user's push subscription from database
    const response = await fetch(
      `${supabaseUrl}/rest/v1/user_push_subscriptions?user_id=eq.${userId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    )

    const subscriptions = await response.json()

    if (!subscriptions || subscriptions.length === 0) {
      console.error('No push subscription found for user:', userId)
      throw new Error('User has no push subscription')
    }

    const subscription = subscriptions[0].subscription

    // Validate subscription format
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      throw new Error('Invalid subscription format')
    }

    // Customize notification based on mission type
    let notificationTitle = title;
    let notificationBody = body;
    let notificationData = data;

    if (missionType === 'immediate') {
      notificationTitle = "🚨 Nouvelle mission immédiate";
      notificationBody = `${data.sourceLanguage} → ${data.targetLanguage} - ${data.duration} minutes`;
      notificationData = {
        ...data,
        url: "/interpreter/missions"
      };
    } else if (missionType === 'scheduled') {
      notificationTitle = "📅 Nouvelle mission programmée";
      notificationBody = `${data.sourceLanguage} → ${data.targetLanguage}\nDate: ${data.startTime}`;
      notificationData = {
        ...data,
        url: "/interpreter/calendar"
      };
    }

    // Send push notification
    console.log('Sending push notification...', { notificationTitle, notificationBody });
    const result = await webPush.sendNotification(
      subscription,
      JSON.stringify({
        title: notificationTitle,
        body: notificationBody,
        data: notificationData
      })
    )

    console.log('Push notification sent successfully:', result)

    return new Response(
      JSON.stringify({ 
        message: 'Notification sent successfully',
        result 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error in send-test-notification:', error)
    
    // Check if it's a subscription expiration error
    if (error.statusCode === 410) {
      // Subscription has expired or is invalid
      return new Response(
        JSON.stringify({ 
          error: 'Subscription has expired. Please re-subscribe to notifications.',
          code: 'SUBSCRIPTION_EXPIRED'
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 410
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to send notification',
        code: 'NOTIFICATION_ERROR'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})
