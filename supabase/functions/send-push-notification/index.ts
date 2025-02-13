
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

    // Get VAPID keys from environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push Notification] Missing VAPID keys');
      throw new Error('VAPID configuration missing');
    }

    // Initialize web-push with VAPID details
    webPush.setVapidDetails(
      'mailto:contact@interpretix.io',
      vapidPublicKey,
      vapidPrivateKey
    );

    if (!message?.interpreterIds?.length) {
      return new Response(
        JSON.stringify({ message: 'No interpreter IDs provided' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active subscriptions for these interpreters
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('status', 'active')
      .in('interpreter_id', message.interpreterIds);

    if (subscriptionError) {
      throw subscriptionError;
    }

    if (!subscriptions?.length) {
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

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

          await webPush.sendNotification(
            subscription,
            JSON.stringify({
              title: message.title,
              body: message.body,
              data: message.data
            })
          );

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
