
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import webPush from 'https://esm.sh/web-push@3.6.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get VAPID keys
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('Missing VAPID configuration');
      throw new Error('Missing VAPID configuration');
    }

    // Configure web push
    webPush.setVapidDetails(
      'mailto:contact@aftrad.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Parse request body
    const { userId, title, body, data } = await req.json();
    console.log('Received notification request:', { userId, title, body, data });

    if (!userId) {
      throw new Error('userId is required');
    }

    // Get user's subscription
    const { data: subscriptionData, error: subError } = await supabaseAdmin
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (subError || !subscriptionData) {
      console.error('Subscription fetch error:', subError);
      throw new Error('No valid subscription found');
    }

    // Send push notification
    const pushPayload = JSON.stringify({
      title,
      body,
      data,
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    });

    console.log('Sending push notification with payload:', pushPayload);
    console.log('Using subscription:', subscriptionData.subscription);

    try {
      const result = await webPush.sendNotification(
        subscriptionData.subscription,
        pushPayload,
        {
          vapidDetails: {
            subject: 'mailto:contact@aftrad.com',
            publicKey: vapidPublicKey,
            privateKey: vapidPrivateKey
          }
        }
      );

      console.log('Push notification sent successfully:', result);

      return new Response(
        JSON.stringify({ success: true, message: 'Notification sent' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } catch (pushError) {
      console.error('Push notification error:', pushError);

      // Check if subscription is expired
      if (pushError.statusCode === 410) {
        await supabaseAdmin
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', userId);

        return new Response(
          JSON.stringify({ 
            error: 'SUBSCRIPTION_EXPIRED',
            message: 'Subscription has expired'
          }),
          { 
            status: 410,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      throw pushError;
    }

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
