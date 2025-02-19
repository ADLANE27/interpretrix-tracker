
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import * as webPush from 'https://esm.sh/web-push@3.6.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function handleError(error: Error) {
  console.error('Detailed error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
  
  return new Response(
    JSON.stringify({
      error: error.message,
      name: error.name,
    }),
    {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

serve(async (req) => {
  console.log('Received request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      }
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify required environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Missing VAPID keys configuration');
    }

    // Set VAPID details
    webPush.setVapidDetails(
      'mailto:contact@aftrad.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Parse and validate request body
    const { userId, title, body, data } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Processing notification request for user:', userId);

    // Get user's push subscription
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (subError) {
      console.error('Database error:', subError);
      return new Response(
        JSON.stringify({ error: 'Database error: ' + subError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!subscriptions?.subscription) {
      return new Response(
        JSON.stringify({ error: 'No push subscription found for user' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Found subscription for user');

    // Send push notification
    try {
      const result = await webPush.sendNotification(
        subscriptions.subscription,
        JSON.stringify({
          title,
          body,
          data
        })
      );

      console.log('Push notification sent successfully');
      
      return new Response(
        JSON.stringify({ 
          message: 'Notification sent successfully',
          result
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error('Push notification error:', error);
      
      // Handle expired subscriptions
      if (error.statusCode === 410) {
        console.log('Subscription has expired, removing from database');
        
        await supabaseClient
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', userId);
          
        return new Response(
          JSON.stringify({ error: 'SUBSCRIPTION_EXPIRED' }),
          {
            status: 410,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      return handleError(error);
    }
  } catch (error) {
    return handleError(error);
  }
});
