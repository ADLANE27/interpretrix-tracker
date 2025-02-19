
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'https://esm.sh/web-push@3.6.6'
import { decode as decodeJWT } from "https://deno.land/x/djwt@v2.8/mod.ts";

// Define TypeScript interfaces for type safety
interface NotificationPayload {
  type: 'mission';
  missionType: 'immediate' | 'scheduled';
  sourceLanguage: string;
  targetLanguage: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  missionId: string;
  url: string;
}

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

// Updated CORS headers with proper configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://interpretix.netlify.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  try {
    // Handle CORS preflight requests with proper status code
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    console.log('[send-test-notification] Starting notification process');

    // Verify JWT token manually
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      // Decode the JWT to verify it's valid and get the user ID
      const [header, payload] = await decodeJWT(token);
      console.log('[send-test-notification] JWT decoded successfully:', { header, payload });
      
      if (!payload.sub) {
        throw new Error('Invalid JWT token: missing sub claim');
      }
    } catch (jwtError) {
      console.error('[send-test-notification] JWT verification failed:', jwtError);
      throw new Error('Invalid JWT token');
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Set up VAPID details
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Missing VAPID configuration');
    }

    webPush.setVapidDetails(
      'mailto:contact@aftrad.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Parse and validate request data
    const requestData = await req.json() as NotificationRequest;
    console.log('[send-test-notification] Request data:', requestData);

    if (!requestData.userId || !requestData.title || !requestData.body) {
      throw new Error('Missing required fields: userId, title, and body');
    }

    // Fetch user's subscription
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', requestData.userId)
      .single();

    if (subscriptionError || !subscriptionData?.subscription) {
      throw new Error(`No valid subscription found for user ${requestData.userId}`);
    }

    // Validate subscription data
    const subscription = subscriptionData.subscription as PushSubscription;
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
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
        JSON.stringify({ success: true, message: 'Push notification sent successfully' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (pushError) {
      console.error('[send-test-notification] Push error:', pushError);
      
      // Handle expired subscriptions
      if (pushError.statusCode === 410) {
        console.log('[send-test-notification] Subscription expired, removing from database');
        await supabaseClient
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
