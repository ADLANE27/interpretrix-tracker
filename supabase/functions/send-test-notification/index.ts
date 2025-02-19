
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import * as webpush from 'npm:web-push@3.6.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, title, body, data } = await req.json()
    console.log('[Push] Received request for user:', userId);

    // Get environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push] Missing VAPID configuration');
      throw new Error('Missing VAPID configuration');
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Push] Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }

    // Configure web push with proper VAPID details
    webpush.setVapidDetails(
      'mailto:contact@aftrad.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('[Push] Fetching subscriptions for user:', userId);

    // Get user's push subscription
    const { data: subscriptionData, error: subError } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    console.log('[Push] Found subscriptions:', subscriptionData?.length || 0);
    
    if (subError) {
      console.error('[Push] Subscription fetch error:', subError);
      throw new Error('Error fetching subscription');
    }

    if (!subscriptionData || subscriptionData.length === 0) {
      console.error('[Push] No subscriptions found for user:', userId);
      throw new Error('No subscription found');
    }

    const subscription = subscriptionData[0].subscription;
    console.log('[Push] Using subscription:', JSON.stringify(subscription, null, 2));

    if (!subscription || !subscription.endpoint || !subscription.keys?.auth || !subscription.keys?.p256dh) {
      console.error('[Push] Invalid subscription format:', subscription);
      throw new Error('Invalid subscription format');
    }

    // Prepare notification payload
    const pushPayload = JSON.stringify({
      title,
      body,
      data,
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    });

    console.log('[Push] Sending notification with payload:', pushPayload);

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      const result = await webpush.sendNotification(
        subscription,
        pushPayload
      );

      console.log('[Push] Notification sent successfully:', result);
      results.successful++;

      return new Response(
        JSON.stringify({
          message: 'Push notification sent successfully',
          status: result.statusCode
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } catch (pushError: any) {
      console.error('[Push] Error sending notification:', pushError);
      results.failed++;
      results.errors.push(pushError.message);

      // Check if subscription is expired or invalid
      if (pushError.statusCode === 404 || pushError.statusCode === 410) {
        console.log('[Push] Subscription is expired or invalid, removing from database');
        
        // Remove invalid subscription
        const { error: deleteError } = await supabase
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          console.error('[Push] Error deleting invalid subscription:', deleteError);
        }
      }

      throw pushError;
    }

  } catch (error) {
    console.error('[Push] Function error:', error);
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
