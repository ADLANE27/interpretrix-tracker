
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webPush from 'npm:web-push';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Push Notification] Starting push notification service');
    
    const { message } = await req.json();
    console.log('[Push Notification] Received payload:', { message });

    if (!message?.interpreterIds?.length) {
      return new Response(
        JSON.stringify({ message: 'No interpreter IDs provided' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Get VAPID keys from environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push Notification] Missing VAPID keys');
      return new Response(
        JSON.stringify({ message: 'VAPID configuration missing' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Initialize web-push with VAPID details
    webPush.setVapidDetails(
      'mailto:contact@interpretix.io',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ message: 'Supabase configuration missing' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active subscriptions for these interpreters
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('status', 'active')
      .in('interpreter_id', message.interpreterIds);

    if (subscriptionError) {
      console.error('[Push Notification] Subscription error:', subscriptionError);
      return new Response(
        JSON.stringify({ message: 'Failed to fetch subscriptions', error: subscriptionError }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    if (!subscriptions?.length) {
      console.log('[Push Notification] No active subscriptions found for interpreters:', message.interpreterIds);
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    console.log('[Push Notification] Found subscriptions:', subscriptions.length);

    // Send notifications
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          console.log('[Push Notification] Sending to subscription:', sub.id);

          await webPush.sendNotification(
            subscription,
            JSON.stringify({
              title: message.title,
              body: message.body,
              data: message.data
            })
          );

          console.log('[Push Notification] Successfully sent to subscription:', sub.id);

          // Update last successful push timestamp
          await supabase
            .from('push_subscriptions')
            .update({ 
              last_successful_push: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);

          return { success: true, subscriptionId: sub.id };
        } catch (error) {
          console.error(`[Push Notification] Error sending to ${sub.id}:`, error);

          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription is expired or invalid
            await supabase
              .from('push_subscriptions')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', sub.id);
          }

          return { 
            success: false, 
            subscriptionId: sub.id,
            error: error.message
          };
        }
      })
    );

    // Prepare response summary
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results
    };

    console.log('[Push Notification] Notification results:', summary);

    return new Response(
      JSON.stringify({ success: true, results: summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Push Notification] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
