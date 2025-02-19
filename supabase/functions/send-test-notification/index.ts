
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webPush from "https://esm.sh/web-push@3.6.6"

// Define TypeScript interfaces for type safety
interface MissionNotificationData {
  type: 'mission';
  missionType: 'immediate' | 'scheduled';
  sourceLanguage: string;
  targetLanguage: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  missionId: string;
}

interface NotificationRequest {
  userId: string;
  data: MissionNotificationData;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    console.log('[send-test-notification] Initializing Supabase client');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Set VAPID details with proper contact email
    console.log('[send-test-notification] Setting up VAPID details');
    webPush.setVapidDetails(
      'mailto:contact@aftrad.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    const requestData: NotificationRequest = await req.json();
    console.log('[send-test-notification] Received notification request:', requestData);

    if (!requestData.userId || !requestData.data) {
      throw new Error('Missing required fields: userId and data are required');
    }

    // Get user's push subscription
    console.log('[send-test-notification] Fetching user subscription');
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', requestData.userId)
      .single()

    if (subscriptionError || !subscriptionData) {
      throw new Error(`No push subscription found for user ${requestData.userId}`);
    }

    console.log('[send-test-notification] Found subscription:', subscriptionData.subscription);

    // Ensure the notification payload matches service worker expectations
    const pushPayload = {
      type: 'mission',
      missionType: requestData.data.missionType,
      sourceLanguage: requestData.data.sourceLanguage,
      targetLanguage: requestData.data.targetLanguage,
      duration: requestData.data.duration,
      url: '/interpreter',
      missionId: requestData.data.missionId,
      startTime: requestData.data.startTime,
      endTime: requestData.data.endTime
    };

    console.log('[send-test-notification] Sending push notification with payload:', pushPayload);

    try {
      await webPush.sendNotification(
        subscriptionData.subscription,
        JSON.stringify(pushPayload)
      );
      console.log('[send-test-notification] Push notification sent successfully');

      return new Response(
        JSON.stringify({ message: 'Push notification sent successfully' }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      )
    } catch (pushError) {
      console.error('[send-test-notification] Push notification failed:', pushError);
      
      // If the subscription is invalid, remove it from the database
      if (pushError.statusCode === 410) {
        console.log('[send-test-notification] Subscription expired, removing from database');
        await supabaseClient
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', requestData.userId);
      }
      
      throw pushError;
    }
  } catch (error) {
    console.error('[send-test-notification] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: error.statusCode || 500,
      },
    )
  }
})
