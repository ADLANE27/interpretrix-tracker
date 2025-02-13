
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
    
    // Log request details
    const reqBody = await req.json();
    console.log('[Push Notification] Raw request body:', JSON.stringify(reqBody));
    
    const { message } = reqBody;
    console.log('[Push Notification] Extracted message:', JSON.stringify(message));

    if (!message?.interpreterIds?.length) {
      console.log('[Push Notification] No interpreter IDs provided in message:', message);
      return new Response(
        JSON.stringify({ message: 'No interpreter IDs provided' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Get and log environment variables (without sensitive data)
    console.log('[Push Notification] Checking environment variables');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('[Push Notification] Environment check:', {
      hasVapidPublicKey: !!vapidPublicKey,
      hasVapidPrivateKey: !!vapidPrivateKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey
    });
    
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
    try {
      console.log('[Push Notification] Initializing web-push');
      webPush.setVapidDetails(
        'mailto:contact@interpretix.io',
        vapidPublicKey,
        vapidPrivateKey
      );
      console.log('[Push Notification] web-push initialized successfully');
    } catch (error) {
      console.error('[Push Notification] Error initializing web-push:', error);
      return new Response(
        JSON.stringify({ message: 'Failed to initialize push service', error: error.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Push Notification] Missing Supabase configuration');
      return new Response(
        JSON.stringify({ message: 'Supabase configuration missing' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Initialize Supabase client
    console.log('[Push Notification] Initializing Supabase client');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active subscriptions for these interpreters
    console.log('[Push Notification] Fetching subscriptions for interpreters:', message.interpreterIds);
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

    console.log('[Push Notification] Found subscriptions:', {
      count: subscriptions.length,
      subscriptionIds: subscriptions.map(s => s.id)
    });

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

          console.log('[Push Notification] Preparing notification for subscription:', {
            id: sub.id,
            endpoint: subscription.endpoint
          });

          const payload = {
            title: message.title,
            body: message.body,
            data: message.data
          };

          console.log('[Push Notification] Notification payload:', payload);

          await webPush.sendNotification(
            subscription,
            JSON.stringify(payload)
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
            console.log(`[Push Notification] Marking subscription ${sub.id} as expired`);
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
    console.error('[Push Notification] Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack,
        type: error.constructor.name
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
