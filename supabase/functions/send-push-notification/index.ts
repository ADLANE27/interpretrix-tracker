
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import webPush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Push Notification] Function called with method:', req.method);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    });
  }

  try {
    // Validate method
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    // Log headers for debugging
    console.log('[Push Notification] Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));

    // Parse body
    let requestBody;
    try {
      const rawBody = await req.text();
      console.log('[Push Notification] Raw body:', rawBody);
      requestBody = JSON.parse(rawBody);
    } catch (error) {
      console.error('[Push Notification] Body parse error:', error);
      throw new Error('Invalid request body');
    }

    // Validate body structure
    if (!requestBody?.message?.interpreterIds?.length) {
      throw new Error('Invalid message format: missing interpreterIds');
    }

    // Get Vapid keys
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!supabaseUrl || !supabaseKey || !vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Configure Web Push
    webPush.setVapidDetails(
      'mailto:contact@interpretix.io',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Get active subscriptions
    const { data: subscriptions, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('status', 'active')
      .in('interpreter_id', requestBody.message.interpreterIds);

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('[Push Notification] Found subscriptions:', subscriptions);

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
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          const payload = JSON.stringify({
            title: requestBody.message.title || 'Nouvelle notification',
            body: requestBody.message.body || '',
            data: requestBody.message.data || {}
          });

          console.log('[Push Notification] Sending to:', sub.endpoint);
          await webPush.sendNotification(subscription, payload);
          console.log('[Push Notification] Successfully sent to:', sub.endpoint);

          // Update last successful push
          await supabase
            .from('push_subscriptions')
            .update({
              last_successful_push: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);

          return { success: true, subscriptionId: sub.id };
        } catch (error) {
          console.error('[Push Notification] Send error:', error);

          if (error.statusCode === 410 || error.statusCode === 404) {
            // Update expired subscription
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
            error: error.message,
            statusCode: error.statusCode
          };
        }
      })
    );

    // Process results
    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length,
      details: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
    };

    console.log('[Push Notification] Results:', JSON.stringify(summary));

    return new Response(
      JSON.stringify({ success: true, results: summary }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Push Notification] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
