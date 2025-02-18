
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as webPush from "https://esm.sh/web-push@3.4.5"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, content-length, host, user-agent, accept',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[send-test-notification] Handling CORS preflight request');
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    console.log('[send-test-notification] Starting notification process');

    // Verify authorization
    const { authorization } = req.headers;
    if (!authorization) {
      console.error('[send-test-notification] Missing authorization header');
      throw new Error('Missing authorization header');
    }

    // Get VAPID keys from environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[send-test-notification] Missing VAPID keys');
      throw new Error('Push notification configuration missing');
    }

    // Set up web-push with VAPID keys
    webPush.setVapidDetails(
      'mailto:support@aftrad.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Parse request body
    const { userId, title, body, data, missionType = 'test' } = await req.json();
    console.log('[send-test-notification] Processing notification:', { userId, missionType });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('[send-test-notification] Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }

    // Get user's push subscription from database
    console.log('[send-test-notification] Fetching push subscription for user:', userId);
    const response = await fetch(
      `${supabaseUrl}/rest/v1/user_push_subscriptions?user_id=eq.${userId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const subscriptions = await response.json();
    console.log('[send-test-notification] Found subscriptions:', subscriptions.length);

    if (!subscriptions || subscriptions.length === 0) {
      console.error('[send-test-notification] No push subscription found for user:', userId);
      throw new Error('User has no push subscription');
    }

    const subscription = subscriptions[0].subscription;

    // Validate subscription format
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      console.error('[send-test-notification] Invalid subscription format:', subscription);
      throw new Error('Invalid subscription format');
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
    console.log('[send-test-notification] Sending push notification:', { 
      title: notificationTitle, 
      body: notificationBody 
    });

    const result = await webPush.sendNotification(
      subscription,
      JSON.stringify({
        title: notificationTitle,
        body: notificationBody,
        data: notificationData
      })
    );

    console.log('[send-test-notification] Push notification sent successfully:', result);

    // Update notification status in database
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/mission_notifications?mission_id=eq.${data.missionId}&interpreter_id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          status: 'sent',
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!updateResponse.ok) {
      console.error('[send-test-notification] Failed to update notification status:', updateResponse.status);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Notification sent successfully',
        result 
      }),
      { 
        headers: corsHeaders,
        status: 200
      }
    );

  } catch (error) {
    console.error('[send-test-notification] Error:', error);
    
    let statusCode = 500;
    let errorMessage = error instanceof Error ? error.message : 'Failed to send notification';
    let errorCode = 'NOTIFICATION_ERROR';

    // Check for specific error types
    if (error instanceof webPush.WebPushError) {
      console.error('[send-test-notification] WebPush Error:', {
        statusCode: error.statusCode,
        body: error.body,
        headers: error.headers
      });

      if (error.statusCode === 410) {
        statusCode = 410;
        errorMessage = 'Subscription has expired. Please re-subscribe to notifications.';
        errorCode = 'SUBSCRIPTION_EXPIRED';
      }
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: errorCode
      }),
      { 
        headers: corsHeaders,
        status: statusCode
      }
    );
  }
});
