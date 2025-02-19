
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'https://esm.sh/web-push@3.6.6'

// Define TypeScript interfaces for type safety
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

interface NotificationRequest {
  userId: string;
  title: string;
  body: string;
  data: {
    url: string;
  };
}

// CORS headers specifically for interpretix.netlify.app
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://interpretix.netlify.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests first
  if (req.method === 'OPTIONS') {
    console.log('[send-test-notification] Handling OPTIONS request');
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Content-Length': '0',
      }
    });
  }

  try {
    console.log('[send-test-notification] Starting notification process');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[send-test-notification] Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Parse and validate request data
    const requestData = await req.json() as NotificationRequest;
    console.log('[send-test-notification] Request data:', requestData);

    if (!requestData.userId || !requestData.title || !requestData.body) {
      console.error('[send-test-notification] Missing required fields');
      throw new Error('Missing required fields: userId, title, and body');
    }

    // Set up VAPID details
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[send-test-notification] Missing VAPID configuration');
      throw new Error('Missing VAPID configuration');
    }

    webPush.setVapidDetails(
      'mailto:contact@aftrad.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Get user's subscription
    const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', requestData.userId)
      .single();

    if (subscriptionError || !subscriptionData?.subscription) {
      console.error('[send-test-notification] No valid subscription found:', subscriptionError);
      throw new Error(`No valid subscription found for user ${requestData.userId}`);
    }

    // Validate subscription data
    const subscription = subscriptionData.subscription as PushSubscription;
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      console.error('[send-test-notification] Invalid subscription format');
      throw new Error('Invalid subscription format');
    }

    console.log('[send-test-notification] Sending push notification with payload:', {
      title: requestData.title,
      body: requestData.body,
      data: requestData.data
    });

    try {
      await webPush.sendNotification(
        subscription,
        JSON.stringify({
          title: requestData.title,
          body: requestData.body,
          ...requestData.data
        })
      );
      console.log('[send-test-notification] Push notification sent successfully');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Push notification sent successfully' 
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 200,
        }
      );
    } catch (pushError) {
      console.error('[send-test-notification] Push error:', pushError);
      
      // Handle expired subscriptions
      if (pushError.statusCode === 410) {
        console.log('[send-test-notification] Subscription expired, removing from database');
        await supabaseAdmin
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', requestData.userId);
          
        throw new Error('SUBSCRIPTION_EXPIRED');
      }
      
      throw pushError;
    }
  } catch (error) {
    console.error('[send-test-notification] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.statusCode || 500,
      }
    );
  }
});
